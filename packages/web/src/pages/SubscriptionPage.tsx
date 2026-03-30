import { useEffect, useState } from 'react';
import api from '../services/api';

interface CancelResponse {
  end_date: string;
  days_remaining: number;
}

export default function SubscriptionPage() {
  const [sub, setSub] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelInfo, setCancelInfo] = useState<CancelResponse | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.getSubscription();
        setSub(s.data || null);
        const p = await api.getPayments();
        setPayments(p.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load subscription');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await api.cancelSubscription();
      setCancelInfo(response.data ?? null);
      setShowCancelModal(false);
      // Reload subscription data
      const s = await api.getSubscription();
      setSub(s.data || null);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivate = async () => {
    try {
      await api.reactivateSubscription();
      alert('Subscription reactivated successfully!');
      // Reload subscription data
      const s = await api.getSubscription();
      setSub(s.data || null);
      setCancelInfo(null);
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate subscription');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Subscription</h1>
      
      {cancelInfo && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-400 rounded">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-yellow-600 mt-0.5 mr-2"
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
              <h3 className="font-medium text-yellow-900">Subscription Cancelling</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Your subscription will end on{' '}
                <span className="font-semibold">
                  {new Date(cancelInfo.end_date).toLocaleDateString()}
                </span>
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

      {sub ? (
        <div className="p-4 bg-white border rounded">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">{sub.plan_name}</div>
              <div className="text-sm text-gray-600">{sub.price_display} • Renews {new Date(sub.current_period_end * 1000).toLocaleDateString()}</div>
            </div>
            <div className="space-x-2">
              <a href="/pricing?action=upgrade" className="px-3 py-2 bg-sky-600 text-white rounded">Upgrade/Downgrade</a>
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

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Cancel Subscription</h3>
                <div className="mt-2 text-sm text-gray-600">
                  <p className="mb-2">Are you sure you want to cancel your subscription?</p>
                  <p className="mb-2">
                    Cancelling will keep your access until{' '}
                    <span className="font-semibold">
                      {sub?.current_period_end ? new Date(sub.current_period_end * 1000).toLocaleDateString() : 'the end of your billing period'}
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
    </div>
  );
}
