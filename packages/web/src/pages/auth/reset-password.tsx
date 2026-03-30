import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);

  const getPasswordStrength = (pwd: string): { level: number; text: string; color: string } => {
    if (pwd.length < 6) return { level: 0, text: 'Too short', color: 'bg-red-500' };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++;

    if (strength <= 1) return { level: 1, text: 'Weak', color: 'bg-red-500' };
    if (strength === 2) return { level: 2, text: 'Fair', color: 'bg-yellow-500' };
    if (strength === 3) return { level: 3, text: 'Good', color: 'bg-blue-500' };
    return { level: 4, text: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      // Success - redirect to login with success message
      navigate('/login?reset=success');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400 || status === 401) {
        setTokenExpired(true);
        setError('This reset link has expired or is invalid.');
      } else if (status === 429) {
        setError('Too many reset attempts. Please try again later.');
      } else {
        setError(err?.message || 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-600"
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
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Invalid Reset Link</h2>
            <p className="mt-2 text-sm text-gray-600">
              This password reset link is missing or invalid.
            </p>
            <div className="mt-6">
              <Link
                to="/auth/forgot-password"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Request a new reset link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Reset Password
        </h2>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Enter your new password below
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            {tokenExpired && (
              <div className="mt-2">
                <Link
                  to="/auth/forgot-password"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Request a new reset link
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {passwordStrength && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Password strength:</span>
                  <span className={`font-medium ${passwordStrength.level >= 3 ? 'text-green-600' : 'text-gray-600'}`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded">
                  <div
                    className={`h-full rounded transition-all ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.level / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="mt-1 relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
