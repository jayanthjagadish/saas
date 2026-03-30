/**
 * API Response types - shared with backend
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'canceled' | 'past_due' | 'pending' | 'cancellation_pending';
  planId: string;
  /** Enriched plan object returned by the API after the backend fix */
  plan?: {
    name: string;
    tier: string;
    price_monthly: number;
  };
  /** Flat plan name string that some API responses include */
  plan_name?: string;
  /** Human-readable price string, e.g. "$20/mo" */
  price_display?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  /** Unix timestamp (seconds) — alternative casing from backend */
  current_period_end?: number;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'processing' | 'requires_payment_method';
  createdAt: string;
}
