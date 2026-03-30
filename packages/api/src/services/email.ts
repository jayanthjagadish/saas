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

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${config.app.webUrl}/reset-password?token=${token}`;
  const text = `Reset your password at ${resetUrl}. Link expires in 1 hour.`;

  if (config.app.nodeEnv === 'production') {
    // TODO: integrate SendGrid or SMTP
    console.log(`(PROD) Would send reset email to ${to}: ${text}`);
    return;
  }

  // Dev: write to local file
  const filename = path.join(DEV_EMAIL_DIR, `reset-${Date.now()}-${to.replace(/[@.]/g, '_')}.txt`);
  const content = `To: ${to}\nSubject: Password Reset Request\n\n${text}`;
  await fs.promises.writeFile(filename, content, 'utf8');
  console.log(`Password reset email written to ${filename}`);
}

export async function sendCancellationEmail(to: string, endDate: Date): Promise<void> {
  const text = `Your subscription has been cancelled and will remain active until ${endDate.toISOString().split('T')[0]}.`;

  if (config.app.nodeEnv === 'production') {
    // TODO: integrate SendGrid or SMTP
    console.log(`(PROD) Would send cancellation email to ${to}: ${text}`);
    return;
  }

  // Dev: write to local file
  const filename = path.join(DEV_EMAIL_DIR, `cancellation-${Date.now()}-${to.replace(/[@.]/g, '_')}.txt`);
  const content = `To: ${to}\nSubject: Subscription Cancellation Confirmed\n\n${text}`;
  await fs.promises.writeFile(filename, content, 'utf8');
  console.log(`Cancellation email written to ${filename}`);
}

export default { sendVerificationEmail, sendPasswordResetEmail, sendCancellationEmail };