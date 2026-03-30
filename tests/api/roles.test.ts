import { describe, it, expect, beforeAll } from '@jest/globals';

const API = 'http://localhost:3001';
let authToken: string;
let teamId: string;
let ownerUserId: string;

beforeAll(async () => {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@fenster-test.com', password: 'SecureTest123!@#' }),
  });
  const data = await res.json() as any;
  authToken = data?.data?.accessToken ?? '';

  // Fetch the team to get teamId and ownerUserId for subsequent tests
  if (authToken) {
    const teamRes = await fetch(`${API}/teams/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const teamData = await teamRes.json() as any;
    teamId = teamData?.data?.id ?? '';
    ownerUserId = teamData?.data?.members?.find((m: any) => m.role === 'owner')?.userId ?? '';
  }
});

// ─── PATCH /teams/:teamId/members/:userId/role ────────────────────────────────

describe('PATCH /teams/:teamId/members/:userId/role', () => {
  it('401 — rejects request without auth token', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${API}/teams/${fakeId}/members/${fakeId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    });
    expect(res.status).toBe(401);
  });

  it('400 — rejects when trying to assign the owner role', async () => {
    if (!teamId || !ownerUserId) {
      console.warn('Skipping: teamId or ownerUserId not available');
      return;
    }
    const res = await fetch(`${API}/teams/${teamId}/members/${ownerUserId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ role: 'owner' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('CANNOT_ASSIGN_OWNER_ROLE');
  });

  it('403 — rejects when non-owner/admin tries to change a role', async () => {
    // This test requires a second user who is a plain 'member' in the team.
    // Skip gracefully if no such second member exists.
    if (!teamId) {
      console.warn('Skipping: teamId not available');
      return;
    }

    // Attempt to fetch a second member token (would require a second test account)
    let memberToken: string | null = null;
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member@fenster-test.com', password: 'SecureTest123!@#' }),
    });
    if (loginRes.ok) {
      const loginData = await loginRes.json() as any;
      memberToken = loginData?.data?.accessToken ?? null;
    }

    if (!memberToken) {
      console.warn('Skipping: member test account (member@fenster-test.com) not found in DB');
      return;
    }

    const res = await fetch(`${API}/teams/${teamId}/members/${ownerUserId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ role: 'admin' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('200 — owner successfully changes a member\'s role to admin', async () => {
    // Requires a second member in the team. Skip gracefully if none exists.
    if (!teamId) {
      console.warn('Skipping: teamId not available');
      return;
    }

    const teamRes = await fetch(`${API}/teams/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const teamData = await teamRes.json() as any;
    const nonOwnerMember = teamData?.data?.members?.find((m: any) => m.role !== 'owner');

    if (!nonOwnerMember) {
      console.warn('Skipping: no non-owner member exists in the test team');
      return;
    }

    const targetUserId = nonOwnerMember.userId;
    const res = await fetch(`${API}/teams/${teamId}/members/${targetUserId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ role: 'admin' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('userId', targetUserId);
    expect(data.data).toHaveProperty('teamId', teamId);
    expect(data.data).toHaveProperty('role', 'admin');

    // Restore original role to avoid polluting other tests
    await fetch(`${API}/teams/${teamId}/members/${targetUserId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ role: nonOwnerMember.role }),
    });
  });
});

// ─── DELETE /teams/:teamId/members/:userId ────────────────────────────────────

describe('DELETE /teams/:teamId/members/:userId', () => {
  it('401 — rejects request without auth token', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${API}/teams/${fakeId}/members/${fakeId}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('403 — rejects when a plain member tries to remove another member', async () => {
    if (!teamId) {
      console.warn('Skipping: teamId not available');
      return;
    }

    let memberToken: string | null = null;
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member@fenster-test.com', password: 'SecureTest123!@#' }),
    });
    if (loginRes.ok) {
      const loginData = await loginRes.json() as any;
      memberToken = loginData?.data?.accessToken ?? null;
    }

    if (!memberToken) {
      console.warn('Skipping: member test account (member@fenster-test.com) not found in DB');
      return;
    }

    // The member tries to remove the owner (another user)
    const res = await fetch(`${API}/teams/${teamId}/members/${ownerUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('404 — returns not found for a non-existent member', async () => {
    if (!teamId) {
      console.warn('Skipping: teamId not available');
      return;
    }
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${API}/teams/${teamId}/members/${fakeUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('MEMBER_NOT_FOUND');
  });

  it('200 — owner successfully removes a non-owner member', async () => {
    // Requires a second non-owner member in the team. Skip gracefully if none.
    if (!teamId) {
      console.warn('Skipping: teamId not available');
      return;
    }

    const teamRes = await fetch(`${API}/teams/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const teamData = await teamRes.json() as any;
    const nonOwnerMember = teamData?.data?.members?.find((m: any) => m.role !== 'owner');

    if (!nonOwnerMember) {
      console.warn('Skipping: no non-owner member exists in the test team to remove');
      return;
    }

    const res = await fetch(`${API}/teams/${teamId}/members/${nonOwnerMember.userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('removed', true);
  });
});
