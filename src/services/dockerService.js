import { exec, spawn } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class DockerService {
    constructor() {
        this.imageName = 'antigravity-sandbox';
    }

    async buildImage() {
        return new Promise((resolve, reject) => {
            console.log(`[Docker] Building sandbox image ${this.imageName}...`);

            const build = spawn('docker', ['build', '-t', this.imageName, '-f', 'Dockerfile.sandbox', '.']);

            build.stdout.on('data', (data) => {
                process.stdout.write(data.toString());
            });

            build.stderr.on('data', (data) => {
                process.stderr.write(data.toString());
            });

            build.on('close', (code) => {
                if (code === 0) {
                    console.log(`[Docker] Sandbox image built successfully.`);
                    resolve();
                } else {
                    reject(new Error(`Docker build failed with code ${code}`));
                }
            });

            build.on('error', (err) => {
                reject(err);
            });
        });
    }

    async createContainer(jobId) {
        const containerName = `sandbox-${jobId}`;
        try {
            // Run detached container that stays alive
            await execPromise(`docker run -d --name ${containerName} ${this.imageName}`);
            return containerName;
        } catch (error) {
            throw new Error(`Failed to create Docker container: ${error.message}`);
        }
    }

    async removeContainer(containerName) {
        try {
            await execPromise(`docker rm -f ${containerName}`);
        } catch (error) {
            console.error(`[Docker] Failed to remove container ${containerName}: ${error.message}`);
        }
    }

    async execInContainer(containerName, command) {
        return new Promise((resolve) => {
            const docker = spawn('docker', ['exec', '-i', containerName, 'bash']);

            let stdout = '';
            let stderr = '';

            docker.stdout.on('data', (data) => { stdout += data.toString(); });
            docker.stderr.on('data', (data) => { stderr += data.toString(); });

            docker.on('close', (code) => {
                resolve({ stdout, stderr, exitCode: code });
            });

            docker.on('error', (err) => {
                resolve({ stdout, stderr: stderr + err.message, exitCode: 1 });
            });

            // Write command directly to bash stdin, bypassing host shell escaping limits
            docker.stdin.write(command);
            docker.stdin.end();
        });
    }

    async cloneRepo(containerName, repoUrl) {
        // Clone inside container
        // Wipe target dir if exists to be safe
        const cmd = `rm -rf /sandbox/repo && git clone ${repoUrl} /sandbox/repo`;
        const result = await this.execInContainer(containerName, cmd);
        if (result.exitCode !== 0) {
            throw new Error(`Clone failed: ${result.stderr}`);
        }
    }

    async writeWorkflowFile(containerName, rawYaml) {
        // Creates the .github/workflows directory and writes ci.yml
        const base64Content = Buffer.from(rawYaml).toString('base64');
        const script = `
            cd /sandbox/repo
            mkdir -p .github/workflows
            echo "${base64Content}" | base64 --decode > .github/workflows/ci.yml
        `;
        return await this.execInContainer(containerName, script);
    }

    async discoverAndRunTests(containerName) {
        // A script injected into container to discover and run frameworks
        // V3: If no formal test framework is found, fallback to checking syntax
        const discoveryScript = `
      cd /sandbox/repo
      
      # 1. Node.js Test Frameworks
      if [ -f "package.json" ]; then
        if grep -q '"jest"' package.json; then
          echo "FRAMEWORK_DETECTED: jest"
          npm install --silent
          npx jest --json 2>&1 || true
          exit 0
        elif grep -q '"mocha"' package.json; then
          echo "FRAMEWORK_DETECTED: mocha"
          npm install --silent
          npx mocha --reporter json 2>&1 || true
          exit 0
        elif grep -q '"test"' package.json; then
          echo "FRAMEWORK_DETECTED: npm test"
          npm install --silent
          npm test 2>&1 || true
          exit 0
        fi
      fi
      
      # 2. Python Test Frameworks
      if [ -f "pytest.ini" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ] || [ -d "tests" ] || ls test_*.py 1> /dev/null 2>&1; then
        echo "FRAMEWORK_DETECTED: pytest"
        if [ -f "requirements.txt" ]; then pip3 install -r requirements.txt; fi
        pytest --json-report || pytest
        exit 0
      fi
      
      # 3. V3 FALLBACK: Agentic Syntax / Linter Check
      echo "FRAMEWORK_DETECTED: linter_fallback"
      echo "No formal test framework found. Running generic syntax checks..."
      
      # Check JS syntax
      JS_ERRORS=$(find . -name "*.js" -not -path "./node_modules/*" -exec node -c {} \\; 2>&1 | grep -v "Syntax OK" || true)
      
      # Check HTML syntax roughly (look for obvious unclosed tags or JS errors inside)
      # Usually simple JS syntax is enough for basic repos.
      
      # Check Python syntax
      PY_ERRORS=$(find . -name "*.py" -not -path "./venv/*" -exec python3 -m py_compile {} \\; 2>&1 || true)
      
      if [ -z "$JS_ERRORS" ] && [ -z "$PY_ERRORS" ]; then
         echo "All syntax checks passed."
         exit 0
      else
         echo "SYNTAX ERRORS FOUND:"
         echo "$JS_ERRORS"
         echo "$PY_ERRORS"
         exit 1
      fi
    `;

        return await this.execInContainer(containerName, discoveryScript);
    }
}

export const dockerService = new DockerService();
