import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Global setup: ensuring test infrastructure is ready...');
  
  const rootDir = path.resolve(__dirname, '../..');
  
  try {
    // Check DB schema first
    console.log('📊 Checking database schema...');
    execSync('node tests/helpers/check-db-schema.cjs', { 
      cwd: rootDir, 
      stdio: 'inherit',
      env: { 
        ...process.env, 
        NODE_PATH: path.join(rootDir, 'packages/api/node_modules') 
      }
    });
    console.log('✅ Database schema OK');
  } catch (err) {
    console.error('❌ Database schema check failed');
    throw err;
  }
  
  try {
    // Create test user
    console.log('👤 Ensuring test user exists...');
    execSync('node create-test-user.js', { cwd: rootDir, stdio: 'inherit' });
    console.log('✅ Test user ready');
  } catch (err) {
    console.warn('⚠️ Test user setup warning (may already exist):', err);
  }
  
  console.log('🎉 Global setup complete!');
}

export default globalSetup;
