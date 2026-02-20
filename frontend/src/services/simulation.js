// ============================================
// Zenith — Simulation Data Generator
// Provides realistic mock data for the agent run
// ============================================

const AGENTS = ['orchestrator', 'analyzer', 'fixer', 'committer', 'verifier'];

const AGENT_MESSAGES = {
  orchestrator: [
    'Initializing healing pipeline...',
    'Cloning repository to workspace...',
    'Setting up isolated environment...',
    'Installing project dependencies...',
    'Parsing project configuration...',
    'Detecting project type: Node.js + TypeScript',
    'Loading rule engine and fix strategies...',
    'Coordinating agent handoff to Analyzer...',
    'Starting iteration ${iter} of ${maxIter}...',
    'All pre-checks passed. Beginning analysis phase.',
    'Orchestration layer ready. Agents on standby.',
    'Workspace snapshot captured for rollback.',
    'Dispatching tasks to sub-agents...',
    'Pipeline health check: all systems nominal.',
    'Syncing remote references...',
  ],
  analyzer: [
    'Running ESLint with --fix-dry-run...',
    'Detected 14 lint warnings across 8 files.',
    'Running TypeScript compiler in strict mode...',
    'Found 6 type errors in src/utils/*.ts',
    'Analyzing import graph for circular dependencies...',
    'Circular dependency detected: auth.ts → user.ts → auth.ts',
    'Running test suite: 42 tests, 7 failing...',
    'Identifying root cause for test failures...',
    'Dead code detected in src/legacy/helpers.js',
    'Analyzing code coverage: 62% → needs improvement.',
    'Scanning for unused exports...',
    'Checking for deprecated API usage...',
    'Vulnerability scan: 2 moderate, 0 critical.',
    'Profiling build time: 4.2s (above threshold).',
    'Mapping failure dependency chain...',
  ],
  fixer: [
    'Applying auto-fix for ESLint rule: no-unused-vars',
    'Refactoring circular import in auth module...',
    'Fixing type error: Property "email" missing on type User',
    'Adding missing return type annotation to fetchData()',
    'Replacing deprecated Buffer() with Buffer.alloc()',
    'Fixing import path: ./utils → ./utils/index',
    'Updating test assertion: toEqual → toStrictEqual',
    'Adding null check for optional chaining in parser.ts',
    'Converting require() to ES module import...',
    'Fixing race condition in async test setup...',
    'Removing unused variable: tempResult (line 42)',
    'Patching type definition for external module...',
    'Fixing missing await in async function...',
    'Resolving merge conflict markers in config.ts...',
    'Applying prettier formatting to modified files...',
  ],
  committer: [
    'Staging modified files...',
    'Creating commit: fix(lint): resolve no-unused-vars warnings',
    'Creating commit: fix(types): add missing type annotations',
    'Creating commit: refactor(imports): break circular dependency',
    'Pushing to branch: rift/heal-${repo}',
    'Commit SHA: ${sha}',
    'Verifying commit integrity...',
    'Updating PR description with fix summary...',
    'Signed commit with GPG key.',
    'Branch protection check passed.',
    'Squashing intermediate commits...',
    'Setting commit author: Zenith Bot <bot@zenith.dev>',
  ],
  verifier: [
    'Triggering CI pipeline run...',
    'Waiting for CI status check...',
    'CI Build: compiling TypeScript...',
    'CI Build: running test suite...',
    'CI Build: linting source files...',
    'Test results: ${passed} passed, ${failed} failed',
    'Build completed in ${duration}s',
    'CI Status: ${status}',
    'Coverage report: ${coverage}%',
    'All quality gates passed ✓',
    'Regression test: no new failures detected.',
    'Performance benchmark: within acceptable range.',
    'Verifying no breaking changes introduced...',
    'Deployment preview generated successfully.',
    'Final verification complete.',
  ],
};

const BUG_TYPES = ['lint', 'type-error', 'import', 'test', 'runtime'];
const FIX_STATUSES = ['Fixed', 'Fixed', 'Fixed', 'Fixed', 'Failed', 'Escalated', 'Pending'];

const FILES = [
  'src/auth/login.ts',
  'src/utils/helpers.ts',
  'src/api/client.ts',
  'src/components/Dashboard.tsx',
  'src/hooks/useAuth.ts',
  'src/services/user.service.ts',
  'src/middleware/errorHandler.ts',
  'src/config/database.ts',
  'src/models/User.ts',
  'src/routes/api.ts',
  'src/tests/auth.test.ts',
  'src/utils/parser.ts',
  'src/components/Header.tsx',
  'src/services/notification.ts',
  'src/lib/validator.ts',
];

const FIX_DESCRIPTIONS = [
  'Added missing type annotation for return value',
  'Removed unused variable declaration',
  'Fixed circular import by extracting shared types',
  'Updated deprecated API call to v2 endpoint',
  'Added null safety check for optional parameter',
  'Fixed async/await pattern in test setup',
  'Resolved ESLint no-unused-vars warning',
  'Converted CommonJS require to ES6 import',
  'Added explicit return type to exported function',
  'Fixed incorrect type assertion casting',
  'Replaced any type with proper generic constraint',
  'Fixed race condition in event handler',
  'Added missing error boundary component',
  'Updated stale snapshot test assertions',
  'Fixed incorrect module resolution path',
];

const DEBRIEF_PASSED = `The Zenith healing agent completed analysis and remediation of the repository successfully. A total of {fixes} fixes were applied across {files} files, addressing lint violations, type errors, and import issues.

The CI/CD pipeline now passes all checks. Test pass rate improved from {testBefore}% to {testAfter}%, and the overall health score increased by {delta} points. No regressions were introduced during the healing process.

Key improvements include resolution of circular dependencies in the auth module, addition of proper TypeScript annotations across utility functions, and cleanup of deprecated API usage patterns. The codebase is now in a healthier state with improved type safety and reduced technical debt.

Recommendation: Review the auto-generated PR for any business logic changes that may require manual verification. All structural and syntactic fixes have been validated by the CI pipeline.`;

const DEBRIEF_FAILED = `The Zenith healing agent completed {iterations} iterations but was unable to fully resolve all CI/CD failures. Out of {totalFixes} attempted fixes, {failedFixes} could not be automatically resolved and have been escalated for manual review.

Primary blockers include complex runtime errors in the integration test suite that require domain-specific knowledge to resolve. The agent was able to improve the health score by {delta} points, but the pipeline still reports {remainingFailures} failing checks.

The most critical unresolved issues involve database connection pooling configuration and a flaky test in the notification service that appears to be environment-dependent. These issues are documented in the generated PR comments.

Recommendation: A developer should review the escalated items in the fixes table and address the remaining test failures manually. The structural improvements applied by the agent are safe to merge independently.`;

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSHA() {
  return Array.from({ length: 7 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateFix(index) {
  const bugType = randomFrom(BUG_TYPES);
  const status = randomFrom(FIX_STATUSES);
  const confidence = randomInt(55, 99);
  return {
    id: index,
    file: randomFrom(FILES),
    bugType,
    line: randomInt(1, 300),
    confidence,
    description: randomFrom(FIX_DESCRIPTIONS),
    status,
  };
}

function generateTimelineItem(iteration, maxIter, passed) {
  const statuses = iteration < maxIter ? ['success', 'fail', 'fail', 'success'] : (passed ? ['success'] : ['fail']);
  const status = iteration === maxIter ? (passed ? 'success' : 'fail') : randomFrom(statuses);
  return {
    iteration,
    status,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    duration: `${randomInt(8, 45)}s`,
    sha: generateSHA(),
  };
}

function interpolateMessage(msg, vars) {
  let result = msg;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`\${${key}}`, value);
  }
  return result;
}

export {
  AGENTS,
  AGENT_MESSAGES,
  BUG_TYPES,
  FILES,
  FIX_DESCRIPTIONS,
  FIX_STATUSES,
  DEBRIEF_PASSED,
  DEBRIEF_FAILED,
  randomFrom,
  randomInt,
  generateSHA,
  generateFix,
  generateTimelineItem,
  interpolateMessage,
};
