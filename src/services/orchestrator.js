import fs from 'fs';
import path from 'path';
import { jobManager } from './jobManager.js';
import { dockerService } from './dockerService.js';
import { discoveryAgent } from '../agents/discoveryAgent.js';
import { fixerAgent } from '../agents/fixerAgent.js';
import { gitManagerAgent } from '../agents/gitManager.js';
import { workflowAgent } from '../agents/workflowAgent.js';
import { githubService } from './githubService.js';

export async function runOrchestrator(jobId) {
    const job = jobManager.getJob(jobId);
    if (!job) return;

    const startTime = Date.now();
    let containerName = null;
    let maxRetries = 5;
    let iterationsUsed = 0;
    let totalFailures = 0;
    let totalFixes = 0;
    let ciCdStatus = 'FAILED';
    const appliedFixesRecords = [];

    // Make sure sandbox image exists
    await dockerService.buildImage();

    try {
        jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', 'Forking target repository to authenticated user account...');
        const forkedRepoUrl = await githubService.forkRepository(job.repoUrl);
        if (!forkedRepoUrl) {
            throw new Error("Failed to fork repository. Ensure GITHUB_TOKEN is set and valid.");
        }
        jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', `Successfully forked to ${forkedRepoUrl}`);

        // -----------------------------------------------------------------
        // STEP 1 — Clone & Sandbox
        // -----------------------------------------------------------------
        jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', 'Creating isolated Docker container');

        try {
            containerName = await dockerService.createContainer(jobId);
            // Clone the FORKED repo with embedded PAT for push access
            const authCloneUrl = githubService.getAuthenticatedCloneUrl(forkedRepoUrl);
            await dockerService.cloneRepo(containerName, authCloneUrl);
        } catch (cloneErr) {
            console.error(`[Job ${jobId}] Clone failed: Reason:`, cloneErr.stderr || cloneErr.message);
            jobManager.addTimelineEvent(jobId, iterationsUsed, 'FAILED', `Repository clone failed: ${cloneErr.stderr || cloneErr.message}`);
            return generateResultsAndFinish(jobId, job, 'FAILED', startTime, iterationsUsed, totalFailures, totalFixes, maxRetries, appliedFixesRecords);
        }

        jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', 'Repository cloned successfully in sandbox');

        // -----------------------------------------------------------------
        // STEP 1.5 — Workflow Generation (Fallback)
        // -----------------------------------------------------------------
        jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', 'Scanning for existing GitHub Actions workflows...');
        const workflowCheck = await dockerService.execInContainer(containerName, 'ls /sandbox/repo/.github/workflows/*.yml /sandbox/repo/.github/workflows/*.yaml 2>/dev/null || true');

        if (!workflowCheck.stdout.trim()) {
            jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', 'No workflows found. AI generating default CI pipeline...');
            const repoFiles = await dockerService.execInContainer(containerName, 'cd /sandbox/repo && find . -maxdepth 2 -type f -not -path "*/.git/*" -not -path "*/node_modules/*"');

            try {
                const generatedYaml = await workflowAgent.generateWorkflow(repoFiles.stdout, job.repoUrl, job.leaderName);
                await dockerService.writeWorkflowFile(containerName, generatedYaml);

                // Commit the new workflow instantly so it's part of the base branch before testing
                await gitManagerAgent.applyAndCommit(containerName, jobId, job.teamName, job.leaderName, '.github/workflows/ci.yml', generatedYaml, 'Add AI-generated CI workflow');
                jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', 'Successfully generated and committed base CI workflow');
            } catch (err) {
                console.error(`[Job ${jobId}] Failed to generate workflow:`, err);
                jobManager.addTimelineEvent(jobId, iterationsUsed, 'FAILED', `Workflow generation failed: ${err.message}`);
                // Proceed anyway, fallback syntax checker will catch it
            }
        } else {
            jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', 'Existing workflows detected. Proceeding to tests.');
        }

        // -----------------------------------------------------------------
        // STEP 5 — Iteration Loop
        // -----------------------------------------------------------------
        let testsPassed = false;

        while (iterationsUsed < maxRetries) {
            iterationsUsed++;
            jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', `Iteration ${iterationsUsed}: Discovering & running tests`);

            // -----------------------------------------------------------------
            // STEP 2 — Dynamic Test Discovery
            // -----------------------------------------------------------------
            const testResult = await dockerService.discoverAndRunTests(containerName);

            const isPass = parseTestSuccessIndicator(testResult);
            if (isPass) {
                // If it passes on iteration 0, there were no bugs
                testsPassed = true;
                ciCdStatus = 'PASSED';
                jobManager.addTimelineEvent(jobId, iterationsUsed, 'PASSED', `Tests passed on iteration ${iterationsUsed}`);

                jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', `Pushing new AI branch to repository...`);
                // Wait for push to complete
                await gitManagerAgent.pushBranch(containerName, jobId, job.teamName, job.leaderName);
                jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', `Successfully pushed new branch to GitHub!`);

                break; // Stop loop, we succeeded!
            }

            jobManager.addTimelineEvent(jobId, iterationsUsed, 'FAILED', `Tests failed. Analyzing failures...`);

            // -----------------------------------------------------------------
            // STEP 3 & 4 — Multi-Agent Healing Loop & Git Manager
            // -----------------------------------------------------------------
            const fullLog = (testResult.stdout + '\n' + testResult.stderr);
            const failures = await discoveryAgent.extractFailures(fullLog);

            if (!failures || failures.length === 0) {
                jobManager.addTimelineEvent(jobId, iterationsUsed, 'FAILED', `No parsable failures found by AI.`);
                break; // Can't heal what we can't parse
            }

            totalFailures += failures.length;

            for (const failure of failures) {
                // Get file content
                const catResult = await dockerService.execInContainer(containerName, `cat /sandbox/repo/${failure.file}`);
                if (catResult.exitCode !== 0) {
                    console.error(`[Job ${jobId}] Could not read file ${failure.file} in container`);
                    continue;
                }

                const fileContent = catResult.stdout;

                // Generate fix
                const fix = await fixerAgent.generateFix(fileContent, failure);
                if (!fix) continue;

                // Apply patch and commit
                const MappedCommitMsg = fix.commitMessage.startsWith('[AI-AGENT]') ? fix.commitMessage : `[AI-AGENT] ${fix.commitMessage}`;

                const success = await gitManagerAgent.applyAndCommit(
                    containerName,
                    jobId,
                    job.teamName,
                    job.leaderName,
                    failure.file,
                    fix.patchedContent,
                    MappedCommitMsg
                );

                if (success) {
                    totalFixes++;
                    appliedFixesRecords.push({
                        file: failure.file,
                        bugType: failure.bugType,
                        lineNumber: failure.lineNumber,
                        commitMessage: MappedCommitMsg,
                        status: "Fixed",
                        patch: fix.patchedContent // Store for frontend review
                    });
                }
            }
        }

        // Wrap up autonomous execution for bug files
        if (testsPassed && totalFixes > 0) {
            jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', `Applying ${totalFixes} valid fixes to branch...`);

            await gitManagerAgent.pushBranch(containerName, jobId, job.teamName, job.leaderName);
            jobManager.addTimelineEvent(jobId, iterationsUsed, 'IN_PROGRESS', `Successfully pushed branch to original repository`);
        }

        if (!testsPassed) {
            ciCdStatus = 'FAILED';
            jobManager.addTimelineEvent(jobId, iterationsUsed, 'FAILED', `Retry limit reached or unresolvable failures`);
        }

        // Always generate results and cleanup
        generateResultsAndFinish(jobId, job, ciCdStatus, startTime, iterationsUsed, totalFailures, totalFixes, maxRetries, appliedFixesRecords);
        await dockerService.removeContainer(containerName);

    } catch (error) {
        console.error(`[Job ${jobId}] Fatal orchestrator error:`, error);
        jobManager.addTimelineEvent(jobId, iterationsUsed, 'FAILED', `System error: ${error.message}`);
        generateResultsAndFinish(jobId, job, 'FAILED', startTime, iterationsUsed, totalFailures, totalFixes, maxRetries, appliedFixesRecords);
        if (containerName) await dockerService.removeContainer(containerName);
    }
}

function parseTestSuccessIndicator(testResult) {
    // Typical heuristic
    if (testResult.exitCode === 0 && !testResult.stdout.includes('FAIL') && !testResult.stderr.includes('failed')) {
        return true;
    }
    return false;
}

export function generateResultsAndFinish(jobId, job, ciCdStatus, startTime, iterationsUsed, totalFailures, totalFixes, maxRetries, fixes) {
    const timeTakenMs = Date.now() - startTime;
    const mins = Math.floor(timeTakenMs / 60000);
    const secs = Math.floor((timeTakenMs % 60000) / 1000);
    const totalTimeTaken = `${mins}m ${secs}s`;

    // Branch format: TEAM_NAME_LEADER_NAME_AI_Fix
    const branchCreated = gitManagerAgent.getBranchName(jobId, job.teamName, job.leaderName);

    const rawTimeline = jobManager.getJob(jobId).timeline;
    const filteredTimeline = rawTimeline.map(t => ({
        iteration: t.iteration,
        status: t.message || t.status, // Map message cleanly
        timestamp: t.timestamp
    }));

    // Clean patch preview out of fixes before saving to final output
    const finalFixes = (fixes || []).map(f => {
        const { patch, ...rest } = f;
        return rest;
    });

    const results = {
        repoUrl: job.repoUrl,
        teamName: job.teamName,
        leaderName: job.leaderName,
        branchCreated,
        totalFailures,
        totalFixes,
        ciCdStatus,
        totalTimeTaken,
        iterationsUsed,
        maxRetries,
        fixes: finalFixes,
        timeline: filteredTimeline
    };

    jobManager.completeJob(jobId, results);

    try {
        const resultsPath = path.join(process.cwd(), 'results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`[Job ${jobId}] Generated results.json successfully at ${resultsPath}`);
    } catch (err) {
        console.error(`[Job ${jobId}] Failed to write results.json:`, err);
    }
}
