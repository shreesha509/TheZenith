// src/routes/api.route.js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { jobManager } from '../services/jobManager.js';
import { runOrchestrator, generateResultsAndFinish } from '../services/orchestrator.js';
import { gitManagerAgent } from '../agents/gitManager.js';
import { dockerService } from '../services/dockerService.js';

const router = express.Router();

router.post('/analyze', (req, res) => {
    const { repoUrl, teamName, leaderName } = req.body;

    if (!repoUrl || !teamName || !leaderName) {
        return res.status(400).json({ error: 'Missing or invalid required fields (repoUrl, teamName, leaderName)' });
    }

    const jobId = uuidv4();

    jobManager.createJob(jobId, {
        repoUrl,
        teamName,
        leaderName
    });

    runOrchestrator(jobId).catch((err) => {
        console.error(`[Background] Orchestrator crashed for job ${jobId}:`, err);
        jobManager.addTimelineEvent(jobId, jobManager.getJob(jobId)?.currentIteration || 0, 'FAILED', err.message);
    });

    return res.status(200).json({ jobId });
});

router.get('/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobManager.getJob(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'COMPLETED' && job.results) {
        return res.status(200).json(job.results);
    }

    const rawTimeline = job.timeline || [];
    const filteredTimeline = rawTimeline.map(t => ({
        iteration: t.iteration,
        status: t.message || t.status, // Map the English string to status for the UI
        timestamp: t.timestamp
    }));

    return res.status(200).json({
        currentIteration: job.currentIteration,
        status: job.status,
        timeline: filteredTimeline
    });
});

export default router;
