import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import React, { useMemo } from 'react';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

export function StripeWrapper({ children }: { children: React.ReactNode }) {
  const stripePromise = useMemo(() => loadStripe(stripeKey), []);
  return React.createElement(Elements, { stripe: stripePromise }, children);
}

export default function useStripeKey() {
  return stripeKey;
}
