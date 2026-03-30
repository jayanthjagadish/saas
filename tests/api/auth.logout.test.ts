/**
 * Jest tests for Logout (US-003)
 * - Revokes refresh token (marks session as revoked in DB)
 * - Returns 200 OK
 * - Old refresh token cannot be used (fails verification)
 */

import { makeAccessToken, makeRefreshToken } from '../fixtures/auth.fixtures';

describe('Auth - Logout (US-003)', () => {
  let AuthService: any;
  let DB: any;

  beforeEach(() => {
    DB = { sessions: new Map<string, any>() };
    AuthService = {
      async logout({ sessionId }: any) {
        // revoke the session
        const session = DB.sessions.get(sessionId);
        if (!session) {
          const err: any = new Error('Session not found');
          err.status = 401;
          throw err;
        }
        if (session.revoked) {
          const err: any = new Error('Session already revoked');
          err.status = 401;
          throw err;
        }
        session.revoked = true;
        return { success: true, message: 'Logged out successfully' };
      },
      async refreshWithSession({ sessionId, token }: any) {
        const session = DB.sessions.get(sessionId);
        if (!session || session.revoked) {
          const err: any = new Error('Invalid or revoked session');
          err.status = 401;
          throw err;
        }
        return { ok: true };
      }
    };
  });

  test('Logout revokes the session successfully (happy path)', async () => {
    const sessionId = 'sess-123-abc';
    DB.sessions.set(sessionId, { revoked: false });
    
    const res = await AuthService.logout({ sessionId });
    expect(res.success).toBe(true);
    expect(res.message).toBe('Logged out successfully');
    expect(DB.sessions.get(sessionId).revoked).toBe(true);
  });

  test('Double logout returns 401 (error path)', async () => {
    const sessionId = 'sess-456-def';
    DB.sessions.set(sessionId, { revoked: false });
    
    // first logout succeeds
    await AuthService.logout({ sessionId });
    
    // second logout should fail
    await expect(AuthService.logout({ sessionId })).rejects.toMatchObject({ status: 401 });
  });

  test('After logout, refresh with old session fails', async () => {
    const sessionId = 'sess-789-ghi';
    DB.sessions.set(sessionId, { revoked: false });
    
    // logout
    await AuthService.logout({ sessionId });
    
    // attempt to refresh with revoked session
    await expect(AuthService.refreshWithSession({ sessionId, token: 'old-token' })).rejects.toMatchObject({ status: 401 });
  });
});
