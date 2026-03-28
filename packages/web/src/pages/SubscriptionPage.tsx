import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function SubscriptionPage() {
  const [sub, setSub] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      await api.cancelSubscription();
      alert('Subscription cancelled');
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Subscription</h1>
      {sub ? (
        <div className="p-4 bg-white border rounded">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">{sub.plan_name}</div>
              <div className="text-sm text-gray-600">{sub.price_display} • Renews {new Date(sub.current_period_end * 1000).toLocaleDateString()}</div>
            </div>
            <div className="space-x-2">
              <a href="/pricing?action=upgrade" className="px-3 py-2 bg-sky-600 text-white rounded">Upgrade/Downgrade</a>
              <button onClick={handleCancel} className="px-3 py-2 bg-red-600 text-white rounded">Cancel Subscription</button>
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
    </div>
  );
}
