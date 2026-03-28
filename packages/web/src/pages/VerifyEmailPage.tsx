import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const VerifyEmailPage: React.FC = () => {
  const query = useQuery();
  const token = query.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    (async () => {
      try {
        await api.verifyEmail(token);
        setStatus('success');
        setTimeout(() => navigate('/auth/login'), 2000);
      } catch (err: any) {
        setStatus('error');
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        {status === 'verifying' && <p>Verifying your email...</p>}
        {status === 'success' && (
          <div>
            <h2 className="text-xl font-semibold">Email verified</h2>
            <p className="mt-2">Redirecting to login...</p>
          </div>
        )}
        {status === 'error' && (
          <div>
            <h2 className="text-xl font-semibold text-red-600">Link expired or invalid</h2>
            <p className="mt-2">Request a new verification email from the login page.</p>
            <div className="mt-4">
              <button className="text-sky-600 underline" onClick={() => navigate('/auth/login')}>
                Go to login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
