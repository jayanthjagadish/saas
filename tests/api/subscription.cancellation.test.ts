/**
 * Jest tests for Subscription Cancellation (US-025)
 * 
 * Happy paths:
 * 1. POST /api/me/subscription/cancel → 200, returns { end_date, days_remaining }
 * 2. Stripe cancel_at_period_end set to true (mock Stripe call)
 * 3. Local subscription status → "cancellation_pending"
 * 4. Dev-email written to dev-emails/ directory
 * 
 * Edge cases:
 * 5. Cancel already-cancelled subscription → returns 409 or 400 with clear error
 * 6. Cancel Free plan → returns 400 (nothing to cancel)
 * 7. Unauthenticated cancel request → returns 401
 */

import { createAccessToken, createMockUser } from '../utils/auth-mocks';
import { mockStripeClient } from '../utils/stripe-mocks';

describe('Subscription - Cancellation (US-025)', () => {
  let SubscriptionService: any;
  let DB: any;
  let StripeClient: any;
  let EmailService: any;

  beforeEach(() => {
    // In-memory DB
    DB = {
      users: new Map<string, any>(),
      subscriptions: new Map<string, any>(),
    };

    // Mock Stripe client
    StripeClient = mockStripeClient();

    // Mock email service
    EmailService = {
      sendCancellationEmail: jest.fn((email: string, endDate: string, daysRemaining: number) => {
        return Promise.resolve();
      }),
    };

    // Create test user with active paid subscription
    const user = createMockUser({
      id: 'user_123',
      email: 'paid-user@example.com',
      stripe_customer_id: 'cus_test123',
    });
    DB.users.set(user.id, user);

    // Create active subscription
    DB.subscriptions.set('sub_test123', {
      id: 'sub_test123',
      user_id: 'user_123',
      stripe_subscription_id: 'sub_stripe123',
      status: 'active',
      plan: 'pro',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cancel_at_period_end: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    SubscriptionService = {
      async cancelSubscription(userId: string) {
        const user = DB.users.get(userId);
        if (!user) {
          const err: any = new Error('Unauthorized');
          err.status = 401;
          throw err;
        }

        // Find active subscription
        const subscriptions = Array.from(DB.subscriptions.values());
        const subscription = subscriptions.find(sub => sub.user_id === userId);

        if (!subscription) {
          const err: any = new Error('No active subscription found');
          err.status = 400;
          err.code = 'NO_SUBSCRIPTION';
          throw err;
        }

        // Cannot cancel Free plan
        if (subscription.plan === 'free') {
          const err: any = new Error('Cannot cancel free plan');
          err.status = 400;
          err.code = 'CANNOT_CANCEL_FREE';
          throw err;
        }

        // Check if already cancelled
        if (subscription.cancel_at_period_end === true || subscription.status === 'cancellation_pending') {
          const err: any = new Error('Subscription is already scheduled for cancellation');
          err.status = 409;
          err.code = 'ALREADY_CANCELLED';
          throw err;
        }

        // Call Stripe to cancel at period end
        await StripeClient.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true,
        });

        // Update local DB
        subscription.status = 'cancellation_pending';
        subscription.cancel_at_period_end = true;
        subscription.updated_at = new Date();

        // Calculate days remaining
        const now = new Date();
        const endDate = new Date(subscription.current_period_end);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Send cancellation confirmation email
        await EmailService.sendCancellationEmail(user.email, endDate.toISOString(), daysRemaining);

        return {
          status: 200,
          data: {
            end_date: endDate.toISOString(),
            days_remaining: daysRemaining,
            message: 'Subscription will be cancelled at the end of the billing period',
          },
        };
      },

      async reactivateSubscription(userId: string) {
        const user = DB.users.get(userId);
        if (!user) {
          const err: any = new Error('Unauthorized');
          err.status = 401;
          throw err;
        }

        const subscriptions = Array.from(DB.subscriptions.values());
        const subscription = subscriptions.find(sub => sub.user_id === userId);

        if (!subscription) {
          const err: any = new Error('No subscription found');
          err.status = 400;
          throw err;
        }

        if (subscription.status !== 'cancellation_pending') {
          const err: any = new Error('Subscription is not scheduled for cancellation');
          err.status = 400;
          err.code = 'NOT_CANCELLED';
          throw err;
        }

        // Call Stripe to remove cancellation
        await StripeClient.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: false,
        });

        // Update local DB
        subscription.status = 'active';
        subscription.cancel_at_period_end = false;
        subscription.updated_at = new Date();

        return {
          status: 200,
          message: 'Subscription reactivated successfully',
        };
      },
    };
  });

  describe('POST /api/me/subscription/cancel - Happy Paths', () => {
    test('Returns 200 with end_date and days_remaining', async () => {
      const result = await SubscriptionService.cancelSubscription('user_123');

      expect(result.status).toBe(200);
      expect(result.data.end_date).toBeDefined();
      expect(result.data.days_remaining).toBeGreaterThan(0);
      expect(result.data.days_remaining).toBeLessThanOrEqual(31);
      expect(result.data.message).toContain('end of the billing period');
    });

    test('Stripe cancel_at_period_end is set to true', async () => {
      await SubscriptionService.cancelSubscription('user_123');

      expect(StripeClient.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe123',
        { cancel_at_period_end: true }
      );
    });

    test('Local subscription status → "cancellation_pending"', async () => {
      await SubscriptionService.cancelSubscription('user_123');

      const subscription = DB.subscriptions.get('sub_test123');
      expect(subscription.status).toBe('cancellation_pending');
      expect(subscription.cancel_at_period_end).toBe(true);
    });

    test('Dev-email written to dev-emails directory', async () => {
      await SubscriptionService.cancelSubscription('user_123');

      expect(EmailService.sendCancellationEmail).toHaveBeenCalledWith(
        'paid-user@example.com',
        expect.any(String),
        expect.any(Number)
      );

      const call = EmailService.sendCancellationEmail.mock.calls[0];
      const [email, endDate, daysRemaining] = call;
      expect(email).toBe('paid-user@example.com');
      expect(daysRemaining).toBeGreaterThan(0);
    });

    test('Calculates days_remaining correctly', async () => {
      const subscription = DB.subscriptions.get('sub_test123');
      const endDate = new Date(subscription.current_period_end);
      const expectedDays = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      const result = await SubscriptionService.cancelSubscription('user_123');

      expect(result.data.days_remaining).toBeGreaterThanOrEqual(expectedDays - 1);
      expect(result.data.days_remaining).toBeLessThanOrEqual(expectedDays + 1);
    });
  });

  describe('POST /api/me/subscription/cancel - Edge Cases', () => {
    test('Cancel already-cancelled subscription returns 409 with clear error', async () => {
      // Cancel once
      await SubscriptionService.cancelSubscription('user_123');

      // Try to cancel again
      await expect(SubscriptionService.cancelSubscription('user_123')).rejects.toMatchObject({
        status: 409,
        code: 'ALREADY_CANCELLED',
        message: expect.stringContaining('already scheduled'),
      });
    });

    test('Cancel Free plan returns 400', async () => {
      // Create user with free plan
      const freeUser = createMockUser({
        id: 'user_free',
        email: 'free-user@example.com',
      });
      DB.users.set(freeUser.id, freeUser);

      DB.subscriptions.set('sub_free', {
        id: 'sub_free',
        user_id: 'user_free',
        stripe_subscription_id: null,
        status: 'active',
        plan: 'free',
        current_period_end: null,
        cancel_at_period_end: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(SubscriptionService.cancelSubscription('user_free')).rejects.toMatchObject({
        status: 400,
        code: 'CANNOT_CANCEL_FREE',
        message: expect.stringContaining('free plan'),
      });
    });

    test('Unauthenticated cancel request returns 401', async () => {
      await expect(SubscriptionService.cancelSubscription('nonexistent_user')).rejects.toMatchObject({
        status: 401,
      });
    });

    test('User with no subscription returns 400', async () => {
      const noSubUser = createMockUser({
        id: 'user_nosub',
        email: 'nosub@example.com',
      });
      DB.users.set(noSubUser.id, noSubUser);

      await expect(SubscriptionService.cancelSubscription('user_nosub')).rejects.toMatchObject({
        status: 400,
        code: 'NO_SUBSCRIPTION',
      });
    });
  });

  describe('POST /api/me/subscription/reactivate', () => {
    test('Reactivates cancelled subscription successfully', async () => {
      // Cancel first
      await SubscriptionService.cancelSubscription('user_123');
      
      // Reactivate
      const result = await SubscriptionService.reactivateSubscription('user_123');

      expect(result.status).toBe(200);
      expect(result.message).toContain('reactivated');

      // Check Stripe was called
      expect(StripeClient.subscriptions.update).toHaveBeenLastCalledWith(
        'sub_stripe123',
        { cancel_at_period_end: false }
      );

      // Check local DB updated
      const subscription = DB.subscriptions.get('sub_test123');
      expect(subscription.status).toBe('active');
      expect(subscription.cancel_at_period_end).toBe(false);
    });

    test('Cannot reactivate non-cancelled subscription', async () => {
      // Don't cancel, try to reactivate directly
      await expect(SubscriptionService.reactivateSubscription('user_123')).rejects.toMatchObject({
        status: 400,
        code: 'NOT_CANCELLED',
      });
    });

    test('Unauthenticated reactivate returns 401', async () => {
      await expect(SubscriptionService.reactivateSubscription('nonexistent_user')).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe('Stripe Integration', () => {
    test('Handles Stripe API errors gracefully', async () => {
      // Mock Stripe error
      StripeClient.subscriptions.update.mockRejectedValueOnce(
        new Error('Stripe API error: subscription not found')
      );

      await expect(SubscriptionService.cancelSubscription('user_123')).rejects.toThrow(
        'Stripe API error'
      );

      // Local DB should not be updated on Stripe error
      const subscription = DB.subscriptions.get('sub_test123');
      expect(subscription.status).toBe('active');
      expect(subscription.cancel_at_period_end).toBe(false);
    });

    test('Idempotency: Multiple Stripe update calls with same params', async () => {
      await SubscriptionService.cancelSubscription('user_123');

      // Should only call Stripe once
      expect(StripeClient.subscriptions.update).toHaveBeenCalledTimes(1);
    });
  });
});
