import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

export default function TeamPage() {
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const { data: teamData, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const r = await apiService.getTeam();
      return r.data;
    },
  });

  const { data: invitesData } = useQuery({
    queryKey: ['teamInvites'],
    queryFn: async () => {
      const r = await apiService.getTeamInvites();
      return r.data ?? [];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => apiService.createInvite(email),
    onSuccess: (res) => {
      if (res.success) {
        setInviteSuccess(`Invite sent to ${inviteEmail}`);
        setInviteEmail('');
        setInviteError(null);
        qc.invalidateQueries({ queryKey: ['teamInvites'] });
      } else {
        const errMap: Record<string, string> = {
          MEMBER_LIMIT_REACHED: 'Member limit reached — upgrade your plan to add more.',
          INVITE_ALREADY_PENDING: 'An invite is already pending for this email.',
          ALREADY_A_MEMBER: 'This person is already on your team.',
          INSUFFICIENT_ROLE: 'You need owner or admin role to invite members.',
        };
        setInviteError(errMap[(res as any).error] ?? 'Failed to send invite.');
        setInviteSuccess(null);
      }
    },
    onError: () => { setInviteError('Failed to send invite.'); setInviteSuccess(null); },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => apiService.removeMember(memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', 'dashboard'] }),
  });

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading team...</div>;
  }

  const team = teamData;
  const invites = invitesData ?? [];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team Management</h1>

      {/* Team Members */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Members {team ? `(${team.memberCount})` : ''}
        </h2>
        {!team || team.members.length === 0 ? (
          <p className="text-gray-500 text-sm">No team members yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {team.members.map((m) => (
              <li key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {m.user?.name ?? m.user?.email ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">{m.user?.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                    m.role === 'owner' ? 'bg-purple-100 text-purple-700'
                    : m.role === 'admin' ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                  }`}>{m.role}</span>
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => removeMutation.mutate(m.id)}
                      disabled={removeMutation.isPending}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invite Member */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Member</h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={() => { if (inviteEmail.trim()) inviteMutation.mutate(inviteEmail.trim()); }}
            disabled={!inviteEmail.trim() || inviteMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
        {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
        {inviteSuccess && <p className="mt-2 text-sm text-green-600">{inviteSuccess}</p>}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Invites</h2>
          <ul className="divide-y divide-gray-100">
            {invites.map((inv) => (
              <li key={inv.id} className="py-3 flex items-center justify-between">
                <p className="text-sm text-gray-700">{inv.email}</p>
                <p className="text-xs text-gray-400">
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
