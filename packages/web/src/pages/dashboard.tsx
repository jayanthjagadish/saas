import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import type { User, DashboardData } from '../types/api';

function DashboardOverviewCard({ data }: { data: DashboardData }) {
  const sub = data.subscription;
  const team = data.team;
  const borderColor =
    !sub || sub.status === 'past_due' || (team && team.memberCount >= team.memberLimit)
      ? 'border-red-500'
      : sub.cancelAtPeriodEnd || (sub.daysUntilRenewal !== null && sub.daysUntilRenewal <= 7) ||
        (team && team.memberCount >= Math.floor(team.memberLimit * 0.8))
      ? 'border-yellow-500'
      : 'border-green-500';

  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    pro: 'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 ${borderColor}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {sub?.planName ?? 'Free'} Plan
        </h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${tierColors[sub?.tier ?? 'free'] ?? tierColors.free}`}>
          {sub?.tier ?? 'free'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Members */}
        {team && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Team Members</p>
            <p className="text-lg font-semibold">{team.memberCount} / {team.memberLimit}</p>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${team.memberCount >= team.memberLimit ? 'bg-red-500' : 'bg-primary-600'}`}
                style={{ width: `${Math.min(100, (team.memberCount / team.memberLimit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Renewal / Cancels */}
        {sub?.currentPeriodEnd && (
          <div>
            <p className="text-sm text-gray-500 mb-1">
              {sub.cancelAtPeriodEnd ? 'Cancels on' : 'Renews'}
            </p>
            <p className={`text-lg font-semibold ${sub.cancelAtPeriodEnd ? 'text-yellow-700' : ''}`}>
              {sub.cancelAtPeriodEnd
                ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                : sub.daysUntilRenewal !== null
                ? `in ${sub.daysUntilRenewal} days`
                : '—'}
            </p>
            {!sub.cancelAtPeriodEnd && (
              <p className="text-xs text-gray-400">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
            )}
          </div>
        )}

        {/* Next billing */}
        <div>
          <p className="text-sm text-gray-500 mb-1">Next Billing</p>
          <p className="text-lg font-semibold">
            {sub && sub.priceMonthly > 0 ? `$${sub.priceMonthly.toFixed(2)}` : '$0.00'}
          </p>
          <p className="text-xs text-gray-400">per month</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [reactivateError, setReactivateError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!apiService.isAuthenticated()) {
      navigate('/auth/login');
    }
  }, [navigate]);

  // Fetch current user
  const { isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await apiService.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      }
      return response.data;
    },
  });

  // Fetch subscription
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await apiService.getSubscription();
      return response.data;
    },
  });

  // Fetch dashboard overview
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiService.getDashboard();
      return response.data;
    },
    retry: 1,
    staleTime: 30_000,
  });

  const handleReactivate = async () => {
    setReactivateError(null);
    try {
      await apiService.reactivateSubscription();
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reactivate subscription';
      setReactivateError(message);
    }
  };

  const handleResendVerification = async () => {
    setVerificationError(null);
    try {
      await apiService.resendVerification();
      setVerificationSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send verification email';
      setVerificationError(message);
    }
  };

  if (userLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const isCancellationPending =
    subscriptionData?.status === 'cancellation_pending' || subscriptionData?.cancelAtPeriodEnd === true;

  // Safely format the period-end date — backend may return Unix timestamp or ISO string
  const cancelDate = subscriptionData?.current_period_end
    ? new Date(subscriptionData.current_period_end * 1000).toLocaleDateString()
    : subscriptionData?.currentPeriodEnd
    ? new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()
    : 'the end of your billing period';

  // Prefer enriched plan name from backend; fall back to the raw plan ID
  const planDisplayName =
    subscriptionData?.plan?.name || subscriptionData?.planId;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* ── Overview Card ─────────────────────────────────────────── */}
        {dashboardData && <DashboardOverviewCard data={dashboardData} />}

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/subscription')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Manage Billing
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Upgrade Plan
            </button>
            <button
              onClick={() => navigate('/team')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Invite Member
            </button>
            <Link
              to="/analytics"
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              View Analytics →
            </Link>
            {dashboardData?.user?.emailVerified === false && !verificationSent && (
              <button
                onClick={handleResendVerification}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
              >
                Resend Verification Email
              </button>
            )}
          </div>
          {verificationSent && (
            <p className="mt-3 text-sm text-green-600 font-medium">✓ Verification email sent! Please check your inbox.</p>
          )}
          {verificationError && (
            <p className="mt-3 text-sm text-red-600">{verificationError}</p>
          )}
        </div>

        {/* Past-Due Payment Warning Banner */}
        {subscriptionData?.status === 'past_due' && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
            <svg
              className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                ⚠️ Payment Failed — Your last payment failed.
              </p>
              <p className="text-sm text-red-700 mt-0.5">
                Retry your payment to keep your subscription active.
              </p>
              <a
                href="/subscription"
                className="mt-2 inline-block px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
              >
                Manage Billing →
              </a>
            </div>
          </div>
        )}

        {/* Cancellation Pending Banner */}
        {isCancellationPending && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
            <svg
              className="h-5 w-5 flex-shrink-0 text-yellow-600 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                Your subscription is set to cancel on{' '}
                <span className="font-semibold">{cancelDate}</span>.
              </p>
              {reactivateError && (
                <p className="mt-1 text-sm text-red-600">{reactivateError}</p>
              )}
              <button
                onClick={handleReactivate}
                className="mt-2 px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Reactivate
              </button>
            </div>
          </div>
        )}

        {/* User Profile Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
          {user && (
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Name:</span> {user.name || 'Not set'}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Member since:</span> {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Subscription Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>

          {subscriptionData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold">
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      subscriptionData.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : subscriptionData.status === 'canceled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {subscriptionData.status.charAt(0).toUpperCase() + subscriptionData.status.slice(1)}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Plan</p>
                  <p className="text-lg font-semibold capitalize">{planDisplayName}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Current Period Start</p>
                  <p className="text-lg">{new Date(subscriptionData.currentPeriodStart).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Period End</p>
                  <p className="text-lg">{new Date(subscriptionData.currentPeriodEnd).toLocaleDateString()}</p>
                </div>
              </div>

              {subscriptionData.status === 'active' && (
                <div className="pt-4 border-t flex gap-4">
                  <button
                    onClick={() => navigate('/subscription')}
                    className="px-4 py-2 bg-gray-100 text-gray-900 rounded hover:bg-gray-200"
                  >
                    Upgrade Plan
                  </button>
                  <button
                    onClick={() => navigate('/subscription')}
                    className="px-4 py-2 bg-red-100 text-red-900 rounded hover:bg-red-200"
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You don't have an active subscription yet.</p>
              <button
                onClick={() => navigate('/pricing')}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Choose a Plan
              </button>
            </div>
          )}
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
          <p className="text-gray-600">
            <button
              onClick={() => navigate('/subscription')}
              className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2"
            >
              View full billing history and invoices →
            </button>{' '}
            Go to Subscription page
          </p>
        </div>
      </div>
    </div>
  );
}
