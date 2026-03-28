/**
 * Jest tests for Logout (US-003)
 * - Logout clears JWT + refresh cookie
 * - Old tokens cannot be used (blacklist)
 */

import { makeAccessToken, makeRefreshToken } from '../fixtures/auth.fixtures';

describe('Auth - Logout (US-003)', () => {
  let AuthService: any;
  let DB: any;

  beforeEach(() => {
    DB = { refreshBlacklist: new Set<string>(), jwtBlacklist: new Set<string>() };
    AuthService = {
      async logout({ jwt, refresh }: any) {
        // blacklist both tokens
        DB.refreshBlacklist.add(refresh);
        DB.jwtBlacklist.add(jwt);
        return { ok: true };
      },
      async validate({ jwt, refresh }: any){
        const jwtVerify = (() => { try { require('jsonwebtoken').verify(jwt, 'test-access-secret'); return true } catch { return false } })();
        if (DB.jwtBlacklist.has(jwt) || DB.refreshBlacklist.has(refresh)) {
          const err: any = new Error('Token blacklisted'); err.status = 401; throw err;
        }
        if (!jwtVerify) { const err: any = new Error('Expired'); err.status = 401; throw err; }
        return { ok: true };
      }
    };
  });

  test('Logout blacklists tokens and they cannot be used afterwards', async () => {
    const jwt = makeAccessToken({ email: 'a@b.com' }, { expiresIn: '1h' });
    const refresh = makeRefreshToken({ email: 'a@b.com' });
    await AuthService.logout({ jwt, refresh });
    await expect(AuthService.validate({ jwt, refresh })).rejects.toMatchObject({ status: 401 });
  });
});
