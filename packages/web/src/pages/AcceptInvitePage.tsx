import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Invalid invite link.'); return; }
    apiService.acceptInvite(token)
      .then((res) => {
        if (res.success) {
          setStatus('success');
          setMessage('You joined the team! Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          const errMap: Record<string, string> = {
            INVITE_NOT_FOUND: 'This invite link is invalid or has already been used.',
            INVITE_EXPIRED: 'This invite has expired. Ask your team owner to resend it.',
            EMAIL_MISMATCH: 'This invite was sent to a different email address.',
            MEMBER_LIMIT_REACHED: 'The team is full — the plan limit has been reached.',
          };
          setStatus('error');
          setMessage(errMap[(res as any).error] ?? 'Failed to accept invite.');
        }
      })
      .catch(() => { setStatus('error'); setMessage('Something went wrong. Please try again.'); });
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Accepting invite...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">🎉</div>
            <p className="text-green-700 font-medium">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-700 mb-4">{message}</p>
            <button onClick={() => navigate('/dashboard')} className="text-primary-600 text-sm hover:underline">
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
