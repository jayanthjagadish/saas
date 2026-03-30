import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api';

function AvatarInitials({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : email[0].toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
      {initials}
    </div>
  );
}

function roleBadgeClass(role: string) {
  if (role === 'owner') return 'bg-purple-100 text-purple-700';
  if (role === 'admin') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between py-3 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="space-y-1.5">
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-2 w-24 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function TeamPage() {
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{ userId: string; name: string } | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const r = await apiService.getCurrentUser();
      return r.data ?? null;
    },
  });

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const r = await apiService.getTeam();
      return r.data ?? null;
    },
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['teamMembers', team?.id],
    queryFn: async () => {
      const r = await apiService.getTeamMembers(team!.id);
      return r.data ?? [];
    },
    enabled: !!team?.id,
  });

  const { data: invitesData } = useQuery({
    queryKey: ['teamInvites'],
    queryFn: async () => {
      const r = await apiService.getTeamInvites();
      return r.data ?? [];
    },
  });

  const currentMember = members?.find((m) => m.userId === currentUser?.id);
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'member' }) =>
      apiService.updateMemberRole(team!.id, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teamMembers', team?.id] }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => apiService.removeMember(team!.id, userId),
    onSuccess: () => {
      setRemoveConfirm(null);
      qc.invalidateQueries({ queryKey: ['teamMembers', team?.id] });
      qc.invalidateQueries({ queryKey: ['team'] });
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
        setInviteError(errMap[(res as any).error?.code] ?? 'Failed to send invite.');
        setInviteSuccess(null);
      }
    },
    onError: () => { setInviteError('Failed to send invite.'); setInviteSuccess(null); },
  });

  const isLoading = teamLoading || membersLoading;
  const invites = invitesData ?? [];

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team Management</h1>

      {/* Confirmation Modal */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Remove Member</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to remove{' '}
              <span className="font-medium">{removeConfirm.name}</span> from the team?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => removeMutation.mutate(removeConfirm.userId)}
                disabled={removeMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {removeMutation.isPending ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Members {team ? `(${team.memberCount})` : ''}
        </h2>
        {isLoading ? (
          <LoadingSkeleton />
        ) : !members || members.length === 0 ? (
          <p className="text-gray-500 text-sm">No team members yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((m) => {
              const isCurrentUser = m.userId === currentUser?.id;
              const displayName = m.name ?? m.email;
              return (
                <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarInitials name={m.name} email={m.email} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {displayName}
                        {isCurrentUser && (
                          <span className="ml-1.5 text-xs text-gray-400 font-normal">(you)</span>
                        )}
                      </p>
                      {m.name && (
                        <p className="text-xs text-gray-500 truncate">{m.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${roleBadgeClass(m.role)}`}
                    >
                      {m.role}
                    </span>
                    {canManage && !isCurrentUser && m.role !== 'owner' && (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) =>
                            updateRoleMutation.mutate({
                              userId: m.userId,
                              role: e.target.value as 'admin' | 'member',
                            })
                          }
                          disabled={updateRoleMutation.isPending}
                          aria-label={`Change role for ${displayName}`}
                          className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                        <button
                          onClick={() => setRemoveConfirm({ userId: m.userId, name: displayName })}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
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
