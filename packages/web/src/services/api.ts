import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { ApiResponse, User, AuthTokens, LoginRequest, SignupRequest, Subscription, Payment } from '../types/api';

/**
 * API Service Layer
 * Handles all communication with Fenster backend
 * Manages JWT access/refresh token flow
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class ApiService {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

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
    const response = await this.client.post<ApiResponse<unknown>>('/auth/signup', payload);
    return response.data;
  }

  async verifyEmail(token: string): Promise<ApiResponse<unknown>> {
    const response = await this.client.post<ApiResponse<unknown>>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
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

  private async refreshAccessToken(): Promise<string> {
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

  async cancelSubscription(): Promise<ApiResponse<Subscription>> {
    const response = await this.client.delete<ApiResponse<Subscription>>('/subscriptions/me');
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
        error: 'Failed to fetch plans'
      } as ApiResponse<any>;
    }
  }

  // ===== Token Management =====

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  private clearAuth(): void {
    localStorage.removeItem('accessToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export default new ApiService();
