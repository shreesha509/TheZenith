import { dockerService } from '../services/dockerService.js';

export class GitManagerAgent {
  constructor() {
    this.branchNameCache = new Map();
  }

  getBranchName(jobId, teamName, leaderName) {
    if (this.branchNameCache.has(jobId)) {
      return this.branchNameCache.get(jobId);
    }
    // BRANCH FORMAT: TEAM_NAME_LEADER_NAME_AI_Fix
    const cleanLeader = String(leaderName).toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '');
    const cleanTeam = String(teamName).toUpperCase().replace(/ /g, '_').replace(/[^A-Z_]/g, '');
    const branchName = `${cleanTeam}_${cleanLeader}_AI_Fix`;
    this.branchNameCache.set(jobId, branchName);
    return branchName;
  }

  async applyAndCommit(containerName, jobId, teamName, leaderName, file, patchedContent, commitMessage) {
    const branchName = this.getBranchName(jobId, teamName, leaderName);

    // Write file in container
    // To handle special characters, we can base64 encode the string and decode it on the container side
    const base64Content = Buffer.from(patchedContent).toString('base64');

    const writeScript = `
      cd /sandbox/repo
      git config --global user.email "ai@antigravity.team"
      git config --global user.name "AI Agent"
      git checkout -B ${branchName} || true
      
      echo "${base64Content}" | base64 --decode > "${file}"
      
      # Ensure commit message explicitly starts with [AI-AGENT]
      MSG="${commitMessage}"
      if [[ $MSG != "[AI-AGENT]"* ]]; then
        MSG="[AI-AGENT] $MSG"
      fi

      git add "${file}"
      git commit -m "$MSG"
    `;

    const result = await dockerService.execInContainer(containerName, writeScript);
    if (result.exitCode !== 0) {
      console.error(`[GitManager] Failed to commit ${file}:`, result.stderr);
      return false;
    }
    return true;
  }

  async pushBranch(containerName, jobId, teamName, leaderName) {
    const branchName = this.getBranchName(jobId, teamName, leaderName);

    // ALWAYS push the branch so the user can see the AI fixes
    // NEVER push to main or master
    const pushScript = `
      cd /sandbox/repo
      if [ "${branchName}" = "MAIN" ] || [ "${branchName}" = "MASTER" ]; then
        echo "ABSOLUTE PROHIBITION: Pushing to main/master is disqualified."
        exit 1
      fi
      git push -f origin ${branchName} 2>&1
    `;

    await dockerService.execInContainer(containerName, pushScript);
  }
}

export const gitManagerAgent = new GitManagerAgent();
