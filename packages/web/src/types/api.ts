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

export interface TeamMember {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user: { id: string; name: string | null; email: string } | null;
}

export interface TeamMemberDetail {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  members: TeamMember[];
}

export interface TeamInvite {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  twoFactorEnabled?: boolean;
}

export interface TwoFactorSetup {
  qrCodeUrl: string;
  secret: string;
  manualEntryKey: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  planName: string;
  invoicePdfUrl: string | null;
}

export interface UsageStats {
  memberCount: number;
  memberLimit: number;
  planName: string;
  teamCreatedAt: string;
  monthlyActiveMembers: number;
}

export interface MemberGrowth {
  month: string;
  count: number;
}

export interface DashboardData {
  user: { name: string | null; email: string; createdAt: string };
  subscription: {
    status: string;
    planName: string;
    tier: string;
    priceMonthly: number;
    currentPeriodEnd: string | null;
    daysUntilRenewal: number | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  team: {
    name: string;
    memberCount: number;
    memberLimit: number;
  } | null;
}
