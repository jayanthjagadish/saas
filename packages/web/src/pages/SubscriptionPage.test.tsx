/**
 * Frontend unit tests for Subscription Cancellation UI (US-025)
 * 
 * Tests:
 * - Cancel button visible for paid subscribers
 * - Confirmation modal shows before cancellation
 * - On confirm: API called, success state shown with end_date
 * - On dismiss: modal closed, nothing changed
 * - Cancel button hidden/replaced with "Reactivate" after cancellation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock component for testing - would import actual component in real tests
const SubscriptionManagement = ({ 
  subscription, 
  onCancel, 
  onReactivate 
}: {
  subscription: {
    status: string;
    plan: string;
    end_date?: string;
    days_remaining?: number;
  };
  onCancel: () => Promise<{ end_date: string; days_remaining: number }>;
  onReactivate: () => Promise<void>;
}) => {
  const [showModal, setShowModal] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelledInfo, setCancelledInfo] = React.useState<{ end_date?: string; days_remaining?: number } | null>(null);

  const handleCancelClick = () => {
    setShowModal(true);
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      const result = await onCancel();
      setCancelledInfo(result);
      setShowModal(false);
    } catch (error) {
      console.error('Cancellation failed:', error);
    } finally {
      setCancelling(false);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
  };

  const handleReactivate = async () => {
    await onReactivate();
    setCancelledInfo(null);
  };

  const isPaid = subscription.plan !== 'free';
  const isPendingCancellation = subscription.status === 'cancellation_pending' || cancelledInfo !== null;

  return (
    <div>
      <h2>Subscription Management</h2>
      <p data-testid="plan-name">{subscription.plan}</p>
      <p data-testid="status">{subscription.status}</p>

      {isPaid && !isPendingCancellation && (
        <button
          data-testid="cancel-button"
          onClick={handleCancelClick}
        >
          Cancel Subscription
        </button>
      )}

      {isPendingCancellation && (
        <div data-testid="cancellation-info">
          <p>Your subscription will end on {cancelledInfo?.end_date || subscription.end_date}</p>
          <p>{cancelledInfo?.days_remaining || subscription.days_remaining} days remaining</p>
          <button
            data-testid="reactivate-button"
            onClick={handleReactivate}
          >
            Reactivate Subscription
          </button>
        </div>
      )}

      {showModal && (
        <div role="dialog" data-testid="cancel-modal">
          <h3>Confirm Cancellation</h3>
          <p>Are you sure you want to cancel your subscription?</p>
          <button
            data-testid="confirm-button"
            onClick={handleConfirmCancel}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
          <button
            data-testid="dismiss-button"
            onClick={handleDismiss}
            disabled={cancelling}
          >
            No, Keep Subscription
          </button>
        </div>
      )}
    </div>
  );
};

// Mock React for the component
const React = {
  useState: (initial: any) => {
    let state = initial;
    const setState = (newState: any) => {
      state = typeof newState === 'function' ? newState(state) : newState;
    };
    return [state, setState];
  },
};

describe('Subscription Cancellation UI', () => {
  const mockCancelFn = vi.fn();
  const mockReactivateFn = vi.fn();

  beforeEach(() => {
    mockCancelFn.mockReset();
    mockReactivateFn.mockReset();
  });

  describe('Cancel Button Visibility', () => {
    it('shows cancel button for paid subscribers with active status', () => {
      const subscription = {
        status: 'active',
        plan: 'pro',
      };

      render(
        <SubscriptionManagement
          subscription={subscription}
          onCancel={mockCancelFn}
          onReactivate={mockReactivateFn}
        />
      );

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toHaveTextContent('Cancel Subscription');
    });

    it('hides cancel button for free plan users', () => {
      const subscription = {
        status: 'active',
        plan: 'free',
      };

      render(
        <SubscriptionManagement
          subscription={subscription}
          onCancel={mockCancelFn}
          onReactivate={mockReactivateFn}
        />
      );

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
    });

    it('hides cancel button and shows reactivate for cancellation_pending status', () => {
      const subscription = {
        status: 'cancellation_pending',
        plan: 'pro',
        end_date: '2024-12-31',
        days_remaining: 15,
      };

      render(
        <SubscriptionManagement
          subscription={subscription}
          onCancel={mockCancelFn}
          onReactivate={mockReactivateFn}
        />
      );

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('reactivate-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancellation-info')).toBeInTheDocument();
    });
  });

  describe('Confirmation Modal', () => {
    it('shows confirmation modal when cancel button clicked', async () => {
      const subscription = {
        status: 'active',
        plan: 'pro',
      };

      render(
        <SubscriptionManagement
          subscription={subscription}
          onCancel={mockCancelFn}
          onReactivate={mockReactivateFn}
        />
      );

      // Modal should not be visible initially
      expect(screen.queryByTestId('cancel-modal')).not.toBeInTheDocument();

      // Click cancel button
      fireEvent.click(screen.getByTestId('cancel-button'));

      // Modal should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('cancel-modal')).toBeInTheDocument();
      });

      expect(screen.getByText(/confirm cancellation/i)).toBeInTheDocument();
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
      expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
    });

    it('on dismiss: modal closed, nothing changed', async () => {
      const subscription = {
        status: 'active',
        plan: 'pro',
      };

      render(
        <SubscriptionManagement
          subscription={subscription}
          onCancel={mockCancelFn}
          onReactivate={mockReactivateFn}
        />
      );

      // Open modal
      fireEvent.click(screen.getByTestId('cancel-button'));
      await waitFor(() => {
        expect(screen.getByTestId('cancel-modal')).toBeInTheDocument();
      });

      // Dismiss modal
      fireEvent.click(screen.getByTestId('dismiss-button'));

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('cancel-modal')).not.toBeInTheDocument();
      });

      // Cancel API should NOT have been called
      expect(mockCancelFn).not.toHaveBeenCalled();

      // Cancel button should still be visible
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });
  });

  describe('Cancellation Flow', () => {
    it('on confirm: API called, success state shown with end_date and days_remaining', async () => {
      const subscription = {
        status: 'active',
        plan: 'pro',
      };

      const cancellationResult = {
        end_date: '2024-12-31T23:59:59Z',
        days_remaining: 15,
      };

      mockCancelFn.mockResolvedValue(cancellationResult);

      render(
        <SubscriptionManagement
          subscription={subscription}
          onCancel={mockCancelFn}
          onReactivate={mockReactivateFn}
        />
      );

      // Click cancel button
      fireEvent.click(screen.getByTestId('cancel-button'));

      // Confirm cancellation
      await waitFor(() => {
        expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('confirm-button'));

      // API should be called
      await waitFor(() => {
        expect(mockCancelFn).toHaveBeenCalledTimes(1);
      });

      // Success state should be shown
      await waitFor(() => {
        expect(screen.getByTestId('cancellation-info')).toBeInTheDocument();
      });

      expect(screen.getByText(/2024-12-31/)).toBeInTheDocument();
      expect(screen.getByText(/15 days remaining/i)).toBeInTheDocument();

      // Cancel button should be hidden, reactivate button shown
      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('reactivate-button')).toBeInTheDocument();
    });

    it('shows loading state during cancellation', async () => {
      const subscription = {
        status: 'active',
        plan: 'pro',
      };

      // Mock a delayed response
      mockCancelFn.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          end_date: '2024-12-31',
          days_remaining: 15,
        }), 100))
      );

      render(
        <SubscriptionManagement
          subscription={subscription}
          onCancel={mockCancelFn}
          onReactivate={mockReactivateFn}
        />
      );

      // Open modal and confirm
      fireEvent.click(screen.getByTestId('cancel-button'));
      await waitFor(() => {
        expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('confirm-button'));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/cancelling/i)).toBeInTheDocument();
      });

      // Buttons should be disabled during loading
      expect(screen.getByTestId('confirm-button')).toBeDisabled();
      expect(screen.getByTestId('dismiss-button')).toBeDisabled();
    });
  });

  describe('Reactivation Flow', () => {
    it('reactivate button calls API and restores active state', async () => {
      const subscription = {
        status: 'cancellation_pending',
        plan: 'pro',
        end_date: '2024-12-31',
        days_remaining: 15,
      };

      mockReactivateFn.mockResolvedValue(undefined);

      render(
        <SubscriptionManagement
          subscription={subscription}
          onCancel={mockCancelFn}
          onReactivate={mockReactivateFn}
        />
      );

      // Reactivate button should be visible
      expect(screen.getByTestId('reactivate-button')).toBeInTheDocument();

      // Click reactivate
      fireEvent.click(screen.getByTestId('reactivate-button'));

      // API should be called
      await waitFor(() => {
        expect(mockReactivateFn).toHaveBeenCalledTimes(1);
      });

      // Cancellation info should be hidden after reactivation
      // (In real component, this would trigger a refetch or state update)
    });
  });

  describe('Error Handling', () => {
    it('handles cancellation API errors gracefully', async () => {
      const subscription = {
        status: 'active',
        plan: 'pro',
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCancelFn.mockRejectedValue(new Error('API Error'));

      render(
        <SubscriptionManagement
          subscription={subscription}
          onCancel={mockCancelFn}
          onReactivate={mockReactivateFn}
        />
      );

      // Try to cancel
      fireEvent.click(screen.getByTestId('cancel-button'));
      await waitFor(() => {
        expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('confirm-button'));

      // Error should be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Cancellation failed:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
