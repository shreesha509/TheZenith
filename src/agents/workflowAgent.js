import { llm } from './llm.js';

export const workflowAgent = {
    async generateWorkflow(repoContentSummary, repoName, leaderName) {
        console.log(`[WorkflowAgent] Generating GitHub Actions workflow for ${repoName}...`);

        const prompt = `
You are an expert DevOps engineer who writes ultra-reliable GitHub Actions workflows.

Based on the following repository structure and files, generate a STRICTly valid YAML workflow file that will build and test this project.
Your workflow MUST match the technology stack deduced from the files (e.g., Node.js if package.json exists, Python if pytest.ini or requirements.txt exists).

REPOSITORY FILES SUMMARY:
${repoContentSummary}

REQUIREMENTS:
1. Trigger on 'push' and 'pull_request' to any branch.
2. Use modern, stable actions (e.g. actions/checkout@v4, actions/setup-node@v4).
3. Include commands to install dependencies.
4. Include commands to run the test suite or linter.
5. Create a job name using the leader name: "Continuous Integration (${leaderName})"

OUTPUT FORMAT:
Output ONLY the raw, exact YAML content. Do NOT wrap it in markdown \`\`\`yaml blocks. Do NOT include any explanations before or after.
        `;

        const response = await llm.invoke(prompt);
        return response.content.replace(/```yaml\n/g, '').replace(/```\n?/g, '').trim();
    }
};
