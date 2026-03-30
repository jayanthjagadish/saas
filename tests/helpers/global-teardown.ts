import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Global teardown: removing worker databases…');

  const rootDir = path.resolve(__dirname, '../..');

  execSync('node tests/helpers/teardown-worker-dbs.cjs', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_PATH: path.join(rootDir, 'packages/api/node_modules'),
    },
  });

  console.log('🎉 Teardown complete!');
}

export default globalTeardown;
