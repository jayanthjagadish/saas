import { stripe } from './stripe.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendCancellationEmail, sendCancelEmail } from './email.js';

export async function cancelSubscription(userId: string): Promise<{
  end_date: Date;
  days_remaining: number;
}> {
  // Find user's active subscription
  const subscription = await Subscription.findOne({
    where: { 
      userId,
      status: 'active'
    }
  });

  if (!subscription) {
    throw new AppError(404, 'NO_ACTIVE_SUBSCRIPTION', 'No active subscription found');
  }

  if (!subscription.stripeSubscriptionId) {
    throw new AppError(400, 'INVALID_SUBSCRIPTION', 'Cannot cancel local subscription');
  }

  // Update Stripe subscription to cancel at period end
  const stripeSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: true }
  );

  // Calculate end date and days remaining
  const endDate = new Date(stripeSubscription.current_period_end * 1000);
  const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Update local subscription
  subscription.status = 'cancellation_pending';
  subscription.cancelAtPeriodEnd = true;
  subscription.currentPeriodEnd = endDate;
  await subscription.save();

  // Get user for email
  const user = await User.findByPk(userId);
  if (user) {
    await sendCancellationEmail(user.email, endDate);
  }

  console.log(`Subscription ${subscription.id} cancelled, ends at ${endDate.toISOString()}`);

  return {
    end_date: endDate,
    days_remaining: daysRemaining
  };
}

export async function reactivateSubscription(userId: string): Promise<void> {
  // Find user's cancellation_pending subscription
  const subscription = await Subscription.findOne({
    where: { 
      userId,
      status: 'cancellation_pending'
    }
  });

  if (!subscription) {
    throw new AppError(404, 'NO_PENDING_CANCELLATION', 'No pending cancellation found');
  }

  if (!subscription.stripeSubscriptionId) {
    throw new AppError(400, 'INVALID_SUBSCRIPTION', 'Cannot reactivate local subscription');
  }

  // Update Stripe subscription to not cancel
  await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: false }
  );

  // Update local subscription
  subscription.status = 'active';
  subscription.cancelAtPeriodEnd = false;
  await subscription.save();

  console.log(`Subscription ${subscription.id} reactivated`);
}

/** Cancel subscription (US-025): sets status 'cancelled', stores cancelledAt, returns accessUntil */
export async function cancelSubscriptionV2(userId: string): Promise<{ accessUntil: Date }> {
  const subscription = await Subscription.findOne({
    where: { userId, status: 'active' }
  });

  if (!subscription) {
    throw new AppError(404, 'NO_ACTIVE_SUBSCRIPTION', 'No active subscription found');
  }

  if (!subscription.stripeSubscriptionId) {
    throw new AppError(400, 'INVALID_SUBSCRIPTION', 'Cannot cancel local subscription');
  }

  const stripeSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: true }
  );

  const accessUntil = new Date(stripeSubscription.current_period_end * 1000);
  const now = new Date();

  subscription.status = 'cancelled';
  subscription.cancelAtPeriodEnd = true;
  subscription.cancelledAt = now;
  subscription.currentPeriodEnd = accessUntil;
  await subscription.save();

  const user = await User.findByPk(userId);
  if (user) {
    await sendCancelEmail(user.email, accessUntil);
  }

  console.log(`Subscription ${subscription.id} cancelled via US-025, access until ${accessUntil.toISOString()}`);

  return { accessUntil };
}

/** Reactivate subscription (US-025): clears cancel_at_period_end, restores 'active' */
export async function reactivateSubscriptionV2(userId: string): Promise<void> {
  const subscription = await Subscription.findOne({
    where: { userId, status: 'cancelled' }
  });

  if (!subscription) {
    throw new AppError(404, 'NO_PENDING_CANCELLATION', 'No cancelled subscription found');
  }

  if (!subscription.stripeSubscriptionId) {
    throw new AppError(400, 'INVALID_SUBSCRIPTION', 'Cannot reactivate local subscription');
  }

  // Only reactivate if still within the period
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
    throw new AppError(400, 'PERIOD_ENDED', 'Subscription period has already ended');
  }

  await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: false }
  );

  subscription.status = 'active';
  subscription.cancelAtPeriodEnd = false;
  subscription.cancelledAt = null;
  await subscription.save();

  console.log(`Subscription ${subscription.id} reactivated via US-025`);
}

export default {
  cancelSubscription,
  reactivateSubscription,
  cancelSubscriptionV2,
  reactivateSubscriptionV2,
};
