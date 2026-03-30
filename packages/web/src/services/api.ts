import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { ApiResponse, User, AuthTokens, LoginRequest, SignupRequest, Subscription, Payment, DashboardData, Team, TeamMember, TeamMemberDetail, TeamInvite, UserProfile, Invoice, TwoFactorSetup, UsageStats, MemberGrowth, BillingCalendar } from '../types/api';

/**
 * API Service Layer
 * Handles all communication with Fenster backend
 * Manages JWT access/refresh token flow
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiService {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Include httpOnly cookies
    });

    // Interceptor to attach access token
    this.client.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor to handle 401 and refresh token
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosError['config'] & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest?._retry) {
          // Don't intercept auth endpoint failures — let components handle them
          const url = originalRequest?.url || '';
          if (url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/auth/refresh')) {
            return Promise.reject(error);
          }

          if (originalRequest) {
            originalRequest._retry = true;
          }

          try {
            // Attempt to refresh the access token
            const newToken = await this.refreshAccessToken();
            this.setAccessToken(newToken);
            if (originalRequest?.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed; redirect to login
            this.clearAuth();
            window.location.href = '/auth/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // ===== Auth Endpoints =====

  async register(payload: SignupRequest): Promise<ApiResponse<User>> {
    const response = await this.client.post<ApiResponse<User>>('/auth/register', payload);
    if (response.data.data && response.data.data.id) {
      // Optionally auto-login after registration
    }
    return response.data;
  }

  // New signup endpoint for US-001 (keeps existing register for compatibility)
  async signup(payload: { email: string; password: string; company_name: string }): Promise<ApiResponse<unknown>> {
    const response = await this.client.post<any>('/auth/signup', payload);
    // Backend returns { user_id, email, message } instead of ApiResponse format
    // Transform it to ApiResponse format for consistency
    if (response.data.user_id) {
      return {
        success: true,
        data: {
          user_id: response.data.user_id,
          email: response.data.email,
          message: response.data.message,
        }
      };
    }
    return response.data;
  }

  async verifyEmail(token: string): Promise<ApiResponse<unknown>> {
    const response = await this.client.post<ApiResponse<unknown>>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    return response.data;
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.post<ApiResponse<{ message: string }>>('/auth/reset-password', { token, password });
    return response.data;
  }

  async login(payload: LoginRequest): Promise<ApiResponse<AuthTokens>> {
    const response = await this.client.post<ApiResponse<AuthTokens>>('/auth/login', payload);
    if (response.data.data?.accessToken) {
      this.setAccessToken(response.data.data.accessToken);
    }
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearAuth();
    }
  }

  async refreshAccessToken(): Promise<string> {
    // Reuse existing refresh promise to avoid multiple refresh requests
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      try {
        const response = await this.client.post<ApiResponse<AuthTokens>>('/auth/refresh');
        if (!response.data.data?.accessToken) {
          throw new Error('No access token in refresh response');
        }
        // Update in-memory token
        this.setAccessToken(response.data.data.accessToken);
        return response.data.data.accessToken;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  // ===== User Endpoints =====

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.client.get<ApiResponse<User>>('/users/me');
    return response.data;
  }

  async updateUser(updates: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.client.put<ApiResponse<User>>('/users/me', updates);
    return response.data;
  }

  async getProfile(): Promise<ApiResponse<UserProfile>> {
    const res = await this.client.get('/users/me');
    return res.data;
  }

  async updateProfile(data: { name?: string; email?: string }): Promise<ApiResponse<UserProfile>> {
    const res = await this.client.put('/users/me', data);
    return res.data;
  }

  async resendVerification(): Promise<ApiResponse<{ message: string }>> {
    const res = await this.client.post<ApiResponse<{ message: string }>>('/users/send-verification');
    return res.data;
  }

  // ===== Subscription Endpoints =====

  async getSubscription(): Promise<ApiResponse<Subscription>> {
    const response = await this.client.get<ApiResponse<Subscription>>('/subscriptions/me');
    return response.data;
  }

  // Create a subscription with payment method (backend returns client_secret for payment confirmation)
  async createSubscription(plan_id: string, payment_method_id: string): Promise<ApiResponse<any>> {
    const response = await this.client.post<ApiResponse<any>>('/subscriptions', { plan_id, payment_method_id });
    return response.data;
  }

  async updateSubscription(updates: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
    const response = await this.client.patch<ApiResponse<Subscription>>('/subscriptions/me', updates);
    return response.data;
  }

  async cancelSubscription(): Promise<ApiResponse<{ end_date: string; days_remaining: number }>> {
    const response = await this.client.post<ApiResponse<{ end_date: string; days_remaining: number }>>('/subscriptions/cancel');
    return response.data;
  }

  async reactivateSubscription(): Promise<ApiResponse<Subscription>> {
    const response = await this.client.post<ApiResponse<Subscription>>('/subscriptions/reactivate');
    return response.data;
  }

  async downgradeSubscription(planId: string, billingInterval: string): Promise<ApiResponse<any>> {
    const res = await this.client.post('/subscriptions/downgrade', { planId, billingInterval });
    return res.data;
  }

  async getSubscriptionStatus(): Promise<ApiResponse<SubscriptionStatus>> {
    const res = await this.client.get<ApiResponse<SubscriptionStatus>>('/subscriptions/status');
    return res.data;
  }

  async retryPayment(): Promise<ApiResponse<{ retried: boolean }>> {
    const res = await this.client.post<ApiResponse<{ retried: boolean }>>('/subscriptions/retry-payment');
    return res.data;
  }

  async getDashboard(): Promise<ApiResponse<DashboardData>> {
    const response = await this.client.get<ApiResponse<DashboardData>>('/dashboard/me/dashboard');
    return response.data;
  }

  // ===== Team Endpoints =====

  async getTeam(): Promise<ApiResponse<Team | null>> {
    const response = await this.client.get<ApiResponse<Team | null>>('/teams/me');
    return response.data;
  }

  async getTeamInvites(): Promise<ApiResponse<TeamInvite[]>> {
    const response = await this.client.get<ApiResponse<TeamInvite[]>>('/teams/me/invites');
    return response.data;
  }

  async createInvite(email: string): Promise<ApiResponse<{ id: string; email: string; token: string }>> {
    const response = await this.client.post<ApiResponse<{ id: string; email: string; token: string }>>('/teams/me/invites', { email });
    return response.data;
  }

  async getTeamMembers(teamId: string): Promise<ApiResponse<TeamMemberDetail[]>> {
    const response = await this.client.get<ApiResponse<TeamMemberDetail[]>>(`/teams/${teamId}/members`);
    return response.data;
  }

  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member'): Promise<ApiResponse<{ updated: boolean }>> {
    const response = await this.client.patch<ApiResponse<{ updated: boolean }>>(`/teams/${teamId}/members/${userId}/role`, { role });
    return response.data;
  }

  async removeMember(teamId: string, userId: string): Promise<ApiResponse<{ removed: boolean }>> {
    const response = await this.client.delete<ApiResponse<{ removed: boolean }>>(`/teams/${teamId}/members/${userId}`);
    return response.data;
  }

  async acceptInvite(token: string): Promise<ApiResponse<{ joined: boolean }>> {
    const response = await this.client.post<ApiResponse<{ joined: boolean }>>(`/teams/invites/${token}/accept`);
    return response.data;
  }

  // ===== Payment Endpoints =====

  async getPayments(): Promise<ApiResponse<Payment[]>> {
    const response = await this.client.get<ApiResponse<Payment[]>>('/payments/me');
    return response.data;
  }

  // ===== Plans =====

  async getPlans(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>('/plans');
      return response.data;
    } catch (error) {
      // Graceful fallback: return a minimal plans payload so UI can render
      return {
        success: false,
        data: [
          { id: 'free', name: 'Free', priceMonthly: 0, priceYearly: 0, features: { teamMembers: 3 } },
          { id: 'pro', name: 'Pro', priceMonthly: 20, priceYearly: 192, features: { teamMembers: 10, analytics: true, prioritySupport: true } },
          { id: 'enterprise', name: 'Enterprise', priceMonthly: 100, priceYearly: 960, features: { teamMembers: 100, analytics: true, prioritySupport: true, customIntegrations: true, customDomainSSO: true } }
        ],
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch plans' }
      } as ApiResponse<any>;
    }
  }

  async getInvoices(): Promise<ApiResponse<{ invoices: Invoice[]; hasMore: boolean }>> {
    const res = await this.client.get('/subscriptions/invoices');
    return res.data;
  }

  async getBillingCalendar(): Promise<ApiResponse<BillingCalendar>> {
    const res = await this.client.get<ApiResponse<BillingCalendar>>('/subscriptions/calendar');
    return res.data;
  }

  // ===== 2FA Endpoints =====

  async setup2FA(): Promise<ApiResponse<TwoFactorSetup>> {
    const res = await this.client.post<ApiResponse<TwoFactorSetup>>('/auth/2fa/setup');
    return res.data;
  }

  async verify2FA(token: string): Promise<ApiResponse<{ message: string }>> {
    const res = await this.client.post<ApiResponse<{ message: string }>>('/auth/2fa/verify', { token });
    return res.data;
  }

  async disable2FA(token: string): Promise<ApiResponse<{ message: string }>> {
    const res = await this.client.post<ApiResponse<{ message: string }>>('/auth/2fa/disable', { token });
    return res.data;
  }

  // ===== Analytics Endpoints =====

  async getUsageStats(): Promise<ApiResponse<UsageStats>> {
    const res = await this.client.get<ApiResponse<UsageStats>>('/analytics/usage');
    return res.data;
  }

  async getMemberGrowth(): Promise<ApiResponse<MemberGrowth[]>> {
    const res = await this.client.get<ApiResponse<MemberGrowth[]>>('/analytics/members/growth');
    return res.data;
  }

  // ===== Token Management (in-memory) =====

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  clearAuth(): void {
    this.accessToken = null;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export default new ApiService();
