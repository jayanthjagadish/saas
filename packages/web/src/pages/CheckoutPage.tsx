import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StripeWrapper } from '../hooks/useStripe';
import StripeCardElement from '../components/StripeCardElement';
import api from '../services/api';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function CheckoutPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const planId = query.get('plan_id') || '';

  const [plan, setPlan] = useState<any | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getPlans();
        const plans = res.data || [];
        const found = plans.find((p: any) => p.id === planId) || plans[0] || null;
        setPlan(found);
      } catch (e) {
        setError('Failed to load plan');
      }
    })();
  }, [planId]);

  const price = useMemo(() => {
    if (!plan) return 0;
    return billing === 'monthly' ? plan.priceMonthly ?? plan.price : plan.priceYearly ?? Math.round((plan.price ?? 0) * 12 * 0.9);
  }, [plan, billing]);

  const handleConfirm = async () => {
    setError(null);
    setLoading(true);
    try {
      // Create a subscription on backend which returns client_secret
      // Note: In real flow we'd create PaymentMethod via stripe.createPaymentMethod; for simplicity backend may accept a payment_method placeholder
      const pmId = 'pm_card_visa';
      const resp = await api.createSubscription(plan.id, pmId);
      if (!resp || !resp.data) throw new Error('Invalid subscription response');
      const clientSecret = resp.data.client_secret;
      // Confirm payment using Stripe JS via backend-provided client_secret
      // We'll use the stripe global if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stripe = (window as any).StripeInstance as any;
      if (stripe && clientSecret) {
        const confirmation = await stripe.confirmCardPayment(clientSecret);
        if (confirmation.error) {
          setError(confirmation.error.message || 'Payment failed');
          setLoading(false);
          return;
        }
      }

      // On success redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
      {!plan && <div>Loading plan...</div>}
      {plan && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 border rounded-lg bg-white">
            <h2 className="text-xl font-medium">{plan.name}</h2>
            <p className="text-gray-600">{plan.description}</p>
            <ul className="mt-4 space-y-2">
              {(plan.features || []).map((f: any, i: number) => (
                <li key={i} className="text-sm">• {f}</li>
              ))}
            </ul>
            <div className="mt-4">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={billing === 'monthly'}
                  onChange={() => setBilling('monthly')}
                />
                <span>Monthly</span>
              </label>
              <label className="flex items-center gap-3 mt-2">
                <input
                  type="radio"
                  checked={billing === 'annual'}
                  onChange={() => setBilling('annual')}
                />
                <span>Annual (save 10%)</span>
              </label>
            </div>
            <div className="mt-4 text-lg font-semibold">Amount: ${price}</div>
          </div>

          <div className="p-4 border rounded-lg bg-white">
            <h3 className="font-medium mb-2">Payment Details</h3>
            <StripeWrapper>
              <StripeCardElement onChange={(e) => setCardError(e.error?.message || null)} />
            </StripeWrapper>

            {cardError && <div className="text-red-600 mt-2">{cardError}</div>}
            {error && <div className="text-red-600 mt-2">{error}</div>}

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Purchase'}
              </button>
              <a href="/pricing" className="text-sm text-gray-600">Cancel</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
