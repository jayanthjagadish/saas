import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start API server
const api = spawn('npm', ['run', 'dev'], {
  cwd: join(__dirname, 'packages', 'api'),
  shell: true,
  stdio: 'inherit'
});

// Start Web server
const web = spawn('npm', ['run', 'dev'], {
  cwd: join(__dirname, 'packages', 'web'),
  shell: true,
  stdio: 'inherit'
});

// Handle cleanup
process.on('SIGINT', () => {
  api.kill();
  web.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  api.kill();
  web.kill();
  process.exit();
});
