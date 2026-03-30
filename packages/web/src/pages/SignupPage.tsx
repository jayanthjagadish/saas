import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    setErrors({});

    const fieldErrors: Record<string, string> = {};
    if (!validateEmail(email)) fieldErrors.email = 'Please enter a valid email';
    if (password.length < 12) fieldErrors.password = 'Password must be at least 12 characters';
    if (!companyName.trim()) fieldErrors.companyName = 'Company name is required';

    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.signup({ email, password, company_name: companyName });
      if (response.success) {
        setMessage((response.data as any)?.message || 'Check your email to verify your account.');
      } else {
        setMessage('An unexpected error occurred. Please try again.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      
      if (status === 409) {
        setErrors({ email: 'Email already registered' });
      } else if (status === 400 && data?.error === 'WEAK_PASSWORD') {
        setErrors({ password: data?.message || 'Password does not meet requirements' });
      } else if (data?.errors) {
        // Map field errors
        const fieldMap: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.errors)) {
          fieldMap[k] = Array.isArray(v) ? (v as any[]).join(' ') : String(v);
        }
        setErrors(fieldMap);
      } else {
        setMessage(data?.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold mb-4">Create your account</h1>

        {message ? (
          <div className="p-4 bg-blue-50 text-blue-800 rounded">
            <p>{message}</p>
            <div className="mt-3">
              <button
                className="text-sm text-blue-600 underline"
                onClick={() => navigate('/auth/login')}
              >
                Go to login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                aria-label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring focus:ring-sky-200 p-2 ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </label>

            <label className="block mt-4">
              <span className="text-sm font-medium text-gray-700">Password</span>
              <input
                aria-label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring focus:ring-sky-200 p-2 ${errors.password ? 'border-red-500' : ''}`}
              />
              {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
              <PasswordStrengthMeter password={password} />
            </label>

            <label className="block mt-4">
              <span className="text-sm font-medium text-gray-700">Company name</span>
              <input
                aria-label="Company name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring focus:ring-sky-200 p-2 ${errors.companyName ? 'border-red-500' : ''}`}
              />
              {errors.companyName && <p className="text-red-600 text-sm mt-1">{errors.companyName}</p>}
            </label>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50"
                aria-busy={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>

            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account?{' '}
              <button type="button" className="text-sky-600 underline" onClick={() => navigate('/auth/login')}>
                Login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default SignupPage;
