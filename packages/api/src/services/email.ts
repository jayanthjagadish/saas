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
  const resetUrl = `${config.app.apiUrl}/auth/reset-password?token=${token}`;
  const text = `Reset your password at ${resetUrl}. Link expires in 1 hour.`;

  if (config.app.nodeEnv === 'production') {
    // TODO: integrate SendGrid or SMTP
    console.log(`(PROD) Would send reset email to ${to}: ${text}`);
    return;
  }

  // Dev: write to local file
  const timestamp = Date.now();
  const filename = path.join(DEV_EMAIL_DIR, `reset-${to}-${timestamp}.txt`);
  const content = `To: ${to}\nSubject: Password Reset Request\n\nURL: ${resetUrl}\nExpires: ${new Date(timestamp + 60 * 60 * 1000).toISOString()}\n`;
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

export async function sendCancelEmail(to: string, accessUntil: Date): Promise<void> {
  const accessDate = accessUntil.toISOString().split('T')[0];
  const text = `Your subscription has been cancelled. Access continues until ${accessDate}.`;

  if (config.app.nodeEnv === 'production') {
    // TODO: integrate SendGrid or SMTP
    console.log(`(PROD) Would send cancel email to ${to}: ${text}`);
    return;
  }

  // Dev: write to local file using cancel-{email}-{timestamp}.txt naming
  const timestamp = Date.now();
  const filename = path.join(DEV_EMAIL_DIR, `cancel-${to}-${timestamp}.txt`);
  const content = `To: ${to}\nSubject: Subscription Cancelled\n\nAccess Until: ${accessUntil.toISOString()}\n\n${text}`;
  await fs.promises.writeFile(filename, content, 'utf8');
  console.log(`Cancel email written to ${filename}`);
}

export async function sendDowngradeEmail(
  to: string,
  planName: string,
  newPrice: number,
  billingInterval: 'monthly' | 'annual',
  effectiveDate: Date
): Promise<void> {
  const intervalLabel = billingInterval === 'annual' ? 'year' : 'month';
  const text = `Your subscription has been downgraded to the ${planName} plan at $${newPrice.toFixed(2)}/${intervalLabel}, effective ${effectiveDate.toISOString().split('T')[0]}.`;

  if (config.app.nodeEnv === 'production') {
    console.log(`(PROD) Would send downgrade email to ${to}: ${text}`);
    return;
  }

  const timestamp = Date.now();
  const filename = path.join(DEV_EMAIL_DIR, `downgrade-${to}-${timestamp}.txt`);
  const content = `To: ${to}\nSubject: Subscription Downgrade Confirmed\n\nPlan: ${planName}\nNew Price: $${newPrice.toFixed(2)}/${intervalLabel}\nEffective Date: ${effectiveDate.toISOString()}\n\n${text}`;
  await fs.promises.writeFile(filename, content, 'utf8');
  console.log(`Downgrade email written to ${filename}`);
}

export default { sendVerificationEmail, sendPasswordResetEmail, sendCancellationEmail, sendCancelEmail, sendDowngradeEmail };