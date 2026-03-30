import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Global setup: ensuring test infrastructure is ready...');

  const rootDir = path.resolve(__dirname, '../..');
  const nodePath = path.join(rootDir, 'packages/api/node_modules');

  try {
    // Validate the source DB schema before cloning it into worker databases
    console.log('📊 Checking database schema...');
    execSync('node tests/helpers/check-db-schema.cjs', {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_PATH: nodePath,
      },
    });
    console.log('✅ Database schema OK');
  } catch (err) {
    console.error('❌ Database schema check failed');
    throw err;
  }

  try {
    // Keep the primary DB test user up-to-date (fallback for single-worker runs)
    console.log('👤 Ensuring test user exists in primary DB...');
    execSync('node create-test-user.js', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Test user ready');
  } catch (err) {
    console.warn('⚠️ Test user setup warning (may already exist):', err);
  }

  // ── Per-worker database isolation ─────────────────────────────────────────
  // Each worker gets its own database (fenster_test_worker_N) so concurrent
  // workers don't race on shared rows.  The webServer API process is started
  // with TEST_DB_NAME=fenster_test_worker_0 (see playwright.config.ts), so API
  // calls all go to worker-0's DB.  Full per-worker API isolation would require
  // one server process per worker (different ports), which is a future step.
  const workerCount = config.workers ?? 4;
  console.log(`🔀 Provisioning ${workerCount} worker database(s)…`);

  execSync('node tests/helpers/setup-worker-dbs.cjs', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_PATH: nodePath,
      WORKER_COUNT: String(workerCount),
      SOURCE_DB: process.env.DB_NAME || 'lession3',
    },
  });

  console.log('🎉 Global setup complete!');
}

export default globalSetup;
