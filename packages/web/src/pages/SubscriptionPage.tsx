import { useEffect, useState } from 'react';
import api from '../services/api';

interface CancelResponse {
  end_date: string;
  days_remaining: number;
}

interface Plan {
  id: string;
  name: string;
  tier: string;
  price_monthly?: number | null;
  price_annual?: number | null;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  max_members?: number | null;
  features?: any;
}

const TIER_ORDER: Record<string, number> = { free: 0, pro: 1, enterprise: 2 };

function getTierRank(tier: string): number {
  return TIER_ORDER[tier?.toLowerCase()] ?? 0;
}

function deriveTier(planName: string | undefined): string {
  const name = (planName ?? '').toLowerCase();
  if (name.includes('enterprise')) return 'enterprise';
  if (name.includes('pro')) return 'pro';
  return 'free';
}

export default function SubscriptionPage() {
  const [sub, setSub] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subStatus, setSubStatus] = useState<{ memberCount: number; memberLimit: number } | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelInfo, setCancelInfo] = useState<CancelResponse | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reactivateSuccess, setReactivateSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const [downgradeSuccess, setDowngradeSuccess] = useState<string | null>(null);
  const [memberLimitError, setMemberLimitError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    const s = await api.getSubscription();
    setSub(s.data || null);
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchSubscription();
        const p = await api.getPayments();
        setPayments(p.data || []);
        const pl = await api.getPlans();
        setPlans(pl.data || []);
        try {
          const ss = await api.getSubscriptionStatus();
          if (ss.data) setSubStatus(ss.data);
        } catch {
          // subscription status is non-critical; ignore errors
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load subscription';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    setActionError(null);
    try {
      const response = await api.cancelSubscription();
      setCancelInfo(response.data ?? null);
      setShowCancelModal(false);
      await fetchSubscription();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setActionError(message);
      setShowCancelModal(false);
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivate = async () => {
    setActionError(null);
    setReactivateSuccess(false);
    try {
      await api.reactivateSubscription();
      setReactivateSuccess(true);
      await fetchSubscription();
      setCancelInfo(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate subscription';
      setActionError(message);
    }
  };

  const handleDowngradeClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setMemberLimitError(null);
    setShowDowngradeModal(true);
  };

  const handleRetryPayment = async () => {
    setRetrying(true);
    setRetrySuccess(false);
    setRetryError(null);
    try {
      await api.retryPayment();
      setRetrySuccess(true);
      await fetchSubscription();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retry payment';
      setRetryError(message);
    } finally {
      setRetrying(false);
    }
  };

  const handleDowngrade = async () => {
    if (!selectedPlan) return;
    setDowngrading(true);
    setMemberLimitError(null);
    setActionError(null);
    try {
      await api.downgradeSubscription(selectedPlan.id, billingInterval);
      setShowDowngradeModal(false);
      setDowngradeSuccess(`Downgraded to ${selectedPlan.name}. Credit applied.`);
      await fetchSubscription();
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code;
      if (errorCode === 'MEMBER_LIMIT_EXCEEDED') {
        const currentMembers = err?.response?.data?.error?.current_members;
        const maxAllowed = err?.response?.data?.error?.max_members ?? selectedPlan.max_members;
        setMemberLimitError(
          `You have ${currentMembers} members, new plan allows ${maxAllowed}. Remove members first.`
        );
      } else {
        const message = err instanceof Error ? err.message : 'Failed to downgrade subscription';
        setActionError(message);
        setShowDowngradeModal(false);
      }
    } finally {
      setDowngrading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  // Safely resolve period-end date: backend may return Unix timestamp (current_period_end)
  // or an ISO date string (currentPeriodEnd). Handle both.
  const endDate = sub?.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd)
    : null;

  const planName = sub?.plan_name || sub?.plan?.name || 'Free';
  const currentTier = sub?.plan?.tier || deriveTier(planName);
  const currentTierRank = getTierRank(currentTier);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Subscription</h1>

      {/* Past-Due Payment Alert Banner */}
      {(sub?.pastDue === true || sub?.status === 'past_due') && (
        <div className="mb-4 p-4 bg-red-50 border border-red-400 rounded">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                ⚠️ Payment Failed — Your last payment failed. Retry now to keep your subscription active.
              </p>
              {sub?.lastPaymentFailedAt && (
                <p className="text-xs text-red-700 mt-1">
                  Failed on {new Date(sub.lastPaymentFailedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {sub?.paymentRetryCount != null && sub.paymentRetryCount > 0 && (
                    <span className="ml-2">· Failed {sub.paymentRetryCount} {sub.paymentRetryCount === 1 ? 'time' : 'times'}</span>
                  )}
                </p>
              )}
              {retrySuccess && (
                <p className="text-xs text-green-700 mt-1 font-medium">✓ Payment retried successfully. Refreshing subscription…</p>
              )}
              {retryError && (
                <p className="text-xs text-red-700 mt-1">{retryError}</p>
              )}
              <button
                onClick={handleRetryPayment}
                disabled={retrying}
                className="mt-2 px-4 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {retrying ? 'Retrying…' : 'Retry Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
      {reactivateSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-400 rounded flex items-start gap-2">
          <svg className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">Subscription reactivated successfully!</p>
            <button onClick={() => setReactivateSuccess(false)} className="mt-1 text-xs text-green-700 underline">Dismiss</button>
          </div>
        </div>
      )}

      {/* Downgrade Success Banner */}
      {downgradeSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-400 rounded flex items-start gap-2">
          <svg className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">{downgradeSuccess}</p>
            <button onClick={() => setDowngradeSuccess(null)} className="mt-1 text-xs text-green-700 underline">Dismiss</button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {actionError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-400 rounded flex items-start gap-2">
          <svg className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{actionError}</p>
            <button onClick={() => setActionError(null)} className="mt-1 text-xs text-red-700 underline">Dismiss</button>
          </div>
        </div>
      )}

      {/* Cancellation Warning Banner */}
      {cancelInfo && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-400 rounded">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="font-medium text-yellow-900">Subscription Cancelling</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Your subscription will end on{' '}
                <span className="font-semibold">{new Date(cancelInfo.end_date).toLocaleDateString()}</span>
                . You have <span className="font-semibold">{cancelInfo.days_remaining} days</span> remaining.
              </p>
              <button
                onClick={handleReactivate}
                className="mt-3 px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
              >
                Reactivate Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Subscription Card */}
      {sub ? (
        <div className="p-4 bg-white border rounded">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">{planName}</div>
              <div className="text-sm text-gray-600">
                {sub.price_display} • Renews {endDate?.toLocaleDateString() ?? 'N/A'}
              </div>
              {subStatus && (
                <div className="mt-1 text-sm text-gray-500">
                  {subStatus.memberCount} of {subStatus.memberLimit} seats used
                </div>
              )}
            </div>
            <div className="space-x-2">
              {!cancelInfo && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-medium mb-2">Payment History</h3>
            <ul className="space-y-2">
              {payments.length === 0 && <li className="text-sm text-gray-600">No payments found.</li>}
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">{p.description}</div>
                    <div className="text-xs text-gray-500">{new Date(p.date).toLocaleString()}</div>
                  </div>
                  <a className="text-sm text-sky-600" href={p.invoice_url} target="_blank" rel="noreferrer">Download</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-white border rounded">No active subscription.</div>
      )}

      {/* Plan Comparison */}
      {sub && plans.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Change Plan</h2>
            <div className="flex items-center bg-gray-100 rounded-full p-1 text-sm">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-3 py-1 rounded-full transition-colors ${billingInterval === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`px-3 py-1 rounded-full transition-colors ${billingInterval === 'annual' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                Annual
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const planTierRank = getTierRank(plan.tier || deriveTier(plan.name));
              const isCurrent = planTierRank === currentTierRank;
              const isDowngrade = planTierRank < currentTierRank;
              const price = billingInterval === 'annual'
                ? (plan.price_annual ?? plan.priceYearly ?? 0)
                : (plan.price_monthly ?? plan.priceMonthly ?? 0);
              const maxMembers = plan.max_members ?? plan.features?.teamMembers ?? null;

              return (
                <div
                  key={plan.id}
                  className={`p-4 border rounded-lg ${isCurrent ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white'}`}
                >
                  <div className="font-semibold text-gray-900">{plan.name}</div>
                  <div className="text-2xl font-bold mt-1">
                    {price === 0 ? 'Free' : `$${price}`}
                    {price > 0 && <span className="text-sm font-normal text-gray-500">/{billingInterval === 'annual' ? 'yr' : 'mo'}</span>}
                  </div>
                  {maxMembers !== null && (
                    <div className="text-xs text-gray-500 mt-1">Up to {maxMembers} members</div>
                  )}
                  <div className="mt-4">
                    {isCurrent ? (
                      <span className="inline-block px-3 py-1.5 text-sm bg-sky-100 text-sky-700 rounded font-medium">Current Plan</span>
                    ) : isDowngrade ? (
                      <button
                        onClick={() => handleDowngradeClick(plan)}
                        className="w-full px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 font-medium"
                      >
                        Downgrade
                      </button>
                    ) : (
                      <a
                        href={`/pricing?action=upgrade&plan=${plan.id}&interval=${billingInterval}`}
                        className="block text-center px-3 py-1.5 text-sm bg-sky-600 text-white rounded hover:bg-sky-700 font-medium"
                      >
                        Upgrade
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Cancel Subscription</h3>
                <div className="mt-2 text-sm text-gray-600">
                  <p className="mb-2">Are you sure you want to cancel your subscription?</p>
                  <p className="mb-2">
                    Cancelling will keep your access until{' '}
                    <span className="font-semibold">
                      {endDate?.toLocaleDateString() ?? 'the end of your billing period'}
                    </span>
                    . After that, you'll be downgraded to Free.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>You'll lose access to premium features</li>
                    <li>Your data will be preserved</li>
                    <li>You can reactivate anytime before the end date</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Keep My Subscription
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade Confirmation Modal */}
      {showDowngradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Downgrade Subscription</h3>
                <div className="mt-3 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-medium">{planName}</span>
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">{selectedPlan.name}</span>
                  </div>
                  <p className="text-green-700 font-medium">
                    ✓ Unused time will be credited to your account.
                  </p>
                  {(selectedPlan.max_members ?? selectedPlan.features?.teamMembers) !== null && (
                    <p className="text-amber-700">
                      ⚠ The {selectedPlan.name} plan allows up to{' '}
                      <strong>{selectedPlan.max_members ?? selectedPlan.features?.teamMembers}</strong> members.
                      Ensure your team is within this limit before downgrading.
                    </p>
                  )}
                  {memberLimitError && (
                    <div className="p-3 bg-red-50 border border-red-300 rounded text-red-700">
                      {memberLimitError}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => { setShowDowngradeModal(false); setMemberLimitError(null); }}
                disabled={downgrading}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Keep Current Plan
              </button>
              <button
                onClick={handleDowngrade}
                disabled={downgrading}
                className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
              >
                {downgrading ? 'Downgrading...' : `Downgrade to ${selectedPlan.name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
