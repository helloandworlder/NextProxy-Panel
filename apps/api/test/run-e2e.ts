/**
 * Panel API Test Runner
 * Run with: bun test:e2e
 */

import { execSync } from 'child_process';

const args = process.argv.slice(2);
const testFile = args[0] || '';

const command = testFile 
  ? `jest --config jest-e2e.json --testPathPattern="${testFile}" --runInBand`
  : `jest --config jest-e2e.json --runInBand`;

console.log(`Running E2E tests: ${command}`);

try {
  execSync(command, { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  process.exit(1);
}
