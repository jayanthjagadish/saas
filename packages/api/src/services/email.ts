import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

const DEV_EMAIL_DIR = path.join(process.cwd(), 'dev-emails');
if (!fs.existsSync(DEV_EMAIL_DIR)) fs.mkdirSync(DEV_EMAIL_DIR, { recursive: true });

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${config.app.webUrl}/verify?token=${token}`;
  const text = `Confirm your signup at ${verifyUrl}. Link expires in 24 hours.`;

  if (config.app.nodeEnv === 'production') {
    // TODO: integrate SendGrid or SMTP
    console.log(`(PROD) Would send email to ${to}: ${text}`);
    return;
  }

  // Dev: write to local file
  const filename = path.join(DEV_EMAIL_DIR, `${Date.now()}-${to.replace(/[@.]/g, '_')}.txt`);
  const content = `To: ${to}\n\n${text}`;
  await fs.promises.writeFile(filename, content, 'utf8');
  console.log(`Verification email written to ${filename}`);
}

export default { sendVerificationEmail };