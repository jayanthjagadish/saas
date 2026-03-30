import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';
import type { TwoFactorSetup } from '../types/api';

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

export default function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: profileData, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiService.getProfile(),
  });

  const profile = profileData?.data;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 2FA state
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  const [totpToken, setTotpToken] = useState('');
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [showDisableInput, setShowDisableInput] = useState(false);
  const [disableToken, setDisableToken] = useState('');
  const [twoFaPending, setTwoFaPending] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setEmail(profile.email);
      setTwoFaEnabled(profile.twoFactorEnabled ?? false);
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (updates: { name?: string; email?: string }) =>
      apiService.updateProfile(updates),
    onSuccess: (res) => {
      if (res.success) {
        setSuccessMsg('Profile updated successfully.');
        setErrorMsg(null);
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else {
        setErrorMsg(res.error?.message ?? 'Update failed.');
        setSuccessMsg(null);
      }
    },
    onError: () => {
      setErrorMsg('An error occurred. Please try again.');
      setSuccessMsg(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    mutation.mutate({ name: name.trim() || undefined, email: email.trim() });
  };

  const handleEnable2FA = async () => {
    setTwoFaError(null);
    setTwoFaPending(true);
    try {
      const res = await apiService.setup2FA();
      if (res.success && res.data) {
        setSetupData(res.data);
      } else {
        setTwoFaError(res.error?.message ?? 'Failed to start 2FA setup.');
      }
    } catch {
      setTwoFaError('Failed to start 2FA setup.');
    } finally {
      setTwoFaPending(false);
    }
  };

  const handleVerify2FA = async () => {
    setTwoFaError(null);
    setTwoFaPending(true);
    try {
      const res = await apiService.verify2FA(totpToken);
      if (res.success && res.data?.enabled === true) {
        setTwoFaEnabled(true);
        setSetupData(null);
        setTotpToken('');
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else {
        setTwoFaError('Invalid code, please try again');
      }
    } catch {
      setTwoFaError('Invalid code, please try again');
    } finally {
      setTwoFaPending(false);
    }
  };

  const handleDisable2FA = async () => {
    setTwoFaError(null);
    setTwoFaPending(true);
    try {
      const res = await apiService.disable2FA(disableToken);
      if (res.success && res.data?.enabled === false) {
        setTwoFaEnabled(false);
        setShowDisableInput(false);
        setDisableToken('');
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else {
        setTwoFaError('Invalid code, please try again');
      }
    } catch {
      setTwoFaError('Invalid code, please try again');
    } finally {
      setTwoFaPending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          Failed to load profile. Please refresh and try again.
        </div>
      </div>
    );
  }

  const initials = getInitials(profile.name, profile.email);
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Profile</h1>

      {/* Avatar + summary card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 flex items-center gap-6">
        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center">
          <span className="text-white text-xl font-bold">{initials}</span>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{profile.name || '(no name set)'}</p>
          <p className="text-sm text-gray-500">{profile.email}</p>
          <p className="text-xs text-gray-400 mt-1">Member since {memberSince}</p>
        </div>
      </div>

      {/* Edit form card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Profile</h2>

        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-yellow-600">
              ⚠️ Changing your email address will require re-verification.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Security card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Two-Factor Authentication</p>
            <p className="text-xs text-gray-500 mt-0.5">Add an extra layer of security to your account.</p>
          </div>
          {twoFaEnabled && (
            <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              2FA Enabled
            </span>
          )}
        </div>

        {twoFaError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {twoFaError}
          </div>
        )}

        {!twoFaEnabled && !setupData && (
          <button
            onClick={handleEnable2FA}
            disabled={twoFaPending}
            className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {twoFaPending ? 'Loading…' : 'Enable 2FA'}
          </button>
        )}

        {!twoFaEnabled && setupData && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scan the QR code with your authenticator app, or enter the key manually.
            </p>
            <img
              src={setupData.qrCodeUrl}
              alt="2FA QR code"
              className="w-40 h-40 border border-gray-200 rounded-lg"
            />
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Manual entry key</p>
              <code className="block bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs font-mono text-gray-700 break-all">
                {setupData.manualEntryKey}
              </code>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit code"
                className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent tracking-widest"
              />
              <button
                onClick={handleVerify2FA}
                disabled={twoFaPending || totpToken.length !== 6}
                className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {twoFaPending ? 'Verifying…' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        )}

        {twoFaEnabled && !showDisableInput && (
          <button
            onClick={() => { setShowDisableInput(true); setTwoFaError(null); }}
            className="mt-2 border border-red-300 text-red-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Disable 2FA
          </button>
        )}

        {twoFaEnabled && showDisableInput && (
          <div className="flex items-center gap-3 mt-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableToken}
              onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent tracking-widest"
            />
            <button
              onClick={handleDisable2FA}
              disabled={twoFaPending || disableToken.length !== 6}
              className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {twoFaPending ? 'Disabling…' : 'Confirm Disable'}
            </button>
            <button
              onClick={() => { setShowDisableInput(false); setDisableToken(''); setTwoFaError(null); }}
              className="text-gray-500 text-sm hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
