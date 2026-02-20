import dotenv from 'dotenv';
dotenv.config();

export class GithubService {
    constructor() {
        this.token = process.env.GITHUB_TOKEN;
    }

    extractOwnerRepo(url) {
        // https://github.com/facebook/react -> { owner: 'facebook', repo: 'react' }
        // https://github.com/facebook/react.git -> { owner: 'facebook', repo: 'react' }
        const match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
        if (!match) return null;
        return { owner: match[1], repo: match[2] };
    }

    async forkRepository(repoUrl) {
        const details = this.extractOwnerRepo(repoUrl);
        if (!details) {
            console.error(`Could not extract github owner and repo from ${repoUrl}`);
            return null;
        }

        console.log(`[GitHub API] Attempting to fork ${details.owner}/${details.repo}...`);

        try {
            // Create Fork API
            const response = await fetch(`https://api.github.com/repos/${details.owner}/${details.repo}/forks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'Antigravity-Agent'
                }
            });

            if (!response.ok) {
                const errText = await response.text();
                // 202 is Accepted (fork in progress)
                if (response.status !== 202) {
                    console.error(`[GitHub API] Failed to fork. Status: ${response.status}`, errText);
                    return null;
                }
            }

            const data = await response.json();
            const forkedCloneUrl = data.clone_url;

            console.log(`[GitHub API] Fork successful. New repo: ${forkedCloneUrl}`);

            // Wait for the fork to be physically ready
            await this.waitForForkToBeReady(details.owner, details.repo);

            return forkedCloneUrl;
        } catch (err) {
            console.error(`[GitHub API] Exception during fork flow:`, err);
            return null;
        }
    }

    async waitForForkToBeReady(originalOwner, repo, maxRetries = 10) {
        // Note: The fork URL will be under the authenticated user's namespace.
        // We actually need the username of the authenticated user to poll properly,
        // or we can poll the general repo API and see if we get a 200.
        // However, the simplest way is to poll the authenticated user's repo path.
        // Let's first get the authenticated user's username.
        let username = "";
        try {
            const userRes = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const userData = await userRes.json();
            username = userData.login;
        } catch (e) {
            console.warn("Could not fetch username for polling, falling back to basic wait.");
            await new Promise(r => setTimeout(r, 8000));
            return;
        }

        const url = `https://api.github.com/repos/${username}/${repo}`;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Antigravity-Agent'
                    }
                });

                if (response.status === 200) {
                    console.log(`[GitHub API] Fork is ready after ${i * 3} seconds.`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return true;
                }
            } catch (error) {
                console.log(`[GitHub API] Waiting for fork... (Attempt ${i + 1}/${maxRetries})`);
            }

            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        console.warn("GitHub fork propagation polling timed out, proceeding anyway.");
    }

    getAuthenticatedCloneUrl(httpsUrl) {
        // https://github.com/MyUsername/react.git
        // -> https://<token>@github.com/MyUsername/react.git
        if (!this.token || !httpsUrl) return httpsUrl;
        return httpsUrl.replace("https://", `https://${this.token}@`);
    }
}

export const githubService = new GithubService();
