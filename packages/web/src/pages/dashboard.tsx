import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';
import type { User } from '../types/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

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
                  <p className="text-lg font-semibold capitalize">{subscriptionData.planId}</p>
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
                  <button className="px-4 py-2 bg-gray-100 text-gray-900 rounded hover:bg-gray-200">
                    Upgrade Plan
                  </button>
                  <button className="px-4 py-2 bg-red-100 text-red-900 rounded hover:bg-red-200">
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You don't have an active subscription yet.</p>
              <button className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
                Choose a Plan
              </button>
            </div>
          )}
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
          <p className="text-gray-600">
            Your invoices and payment history will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
