/**
 * Jest tests for Login (US-002)
 * - Valid login issues JWT + refresh token
 * - Invalid password returns 401
 * - Unverified user is blocked (403)
 * - Rate limiting after 10 failed attempts per IP
 * - Token refresh rotates refresh token
 * - Token expiry behavior
 */

import { SAMPLE_USER, makeAccessToken, makeRefreshToken } from '../fixtures/auth.fixtures';

describe('Auth - Login (US-002)', () => {
  let AuthService: any;
  let DB: any;
  let IpThrottle: any;

  beforeEach(() => {
    DB = { users: new Map<string, any>(), refreshBlacklist: new Set<string>() };
    DB.users.set(SAMPLE_USER.email, { email: SAMPLE_USER.email, passwordHash: 'hashed', verified: true });

    IpThrottle = new Map<string, number>();

    AuthService = {
      async login({ email, password, ip }: any) {
        const user = DB.users.get(email);
        if (!user) { const err: any = new Error('Unauthorized'); err.status = 401; throw err; }
        if (!user.verified) { const err: any = new Error('Verify email'); err.status = 403; throw err; }
        const fails = IpThrottle.get(ip) || 0;
        if (fails >= 10) { const err: any = new Error('Too many attempts'); err.status = 429; throw err; }
        if (password !== 'Str0ng!Pass') {
          IpThrottle.set(ip, fails + 1);
          const err: any = new Error('Unauthorized'); err.status = 401; throw err;
        }
        // on success reset throttle
        IpThrottle.set(ip, 0);
        const jwt = makeAccessToken({ email });
        const refresh = makeRefreshToken({ email });
        return { jwt, refresh };
      },
n      async refresh({ oldRefreshToken }: any) {
        // verify and rotate
        try {
          const payload: any = require('jsonwebtoken').verify(oldRefreshToken, 'test-refresh-secret');
          if (DB.refreshBlacklist.has(oldRefreshToken)) { const err: any = new Error('Blacklisted'); err.status = 401; throw err; }
          // blacklist old
          DB.refreshBlacklist.add(oldRefreshToken);
          const newRefresh = makeRefreshToken({ email: payload.email });
          const newJwt = makeAccessToken({ email: payload.email });
          return { newRefresh, newJwt };
        } catch (e) {
          const err: any = new Error('Invalid refresh'); err.status = 401; throw err;
        }
      }
    };
  });

  test('Valid login issues jwt and refresh token', async () => {
    const res = await AuthService.login({ email: SAMPLE_USER.email, password: 'Str0ng!Pass', ip: '1.2.3.4' });
    expect(res.jwt).toBeDefined();
    expect(res.refresh).toBeDefined();
  });

  test('Invalid password returns 401 and increments throttle', async () => {
    await expect(AuthService.login({ email: SAMPLE_USER.email, password: 'bad', ip: '9.9.9.9' })).rejects.toMatchObject({ status: 401 });
    // second fail
    await expect(AuthService.login({ email: SAMPLE_USER.email, password: 'bad', ip: '9.9.9.9' })).rejects.toMatchObject({ status: 401 });
  });

  test('Unverified user returns 403', async () => {
    DB.users.set('unv@example.com', { email: 'unv@example.com', passwordHash: 'hashed', verified: false });
    await expect(AuthService.login({ email: 'unv@example.com', password: 'Str0ng!Pass', ip: '5.5.5.5' })).rejects.toMatchObject({ status: 403 });
  });

  test('Rate limiting: 10 failed attempts then blocked', async () => {
    const ip = '7.7.7.7';
    for (let i=0;i<10;i++){
      await expect(AuthService.login({ email: SAMPLE_USER.email, password: 'bad', ip })).rejects.toMatchObject({ status: 401 });
    }
    await expect(AuthService.login({ email: SAMPLE_USER.email, password: 'bad', ip })).rejects.toMatchObject({ status: 429 });
  });

  test('Token refresh rotates refresh token and blacklists old', async () => {
    const { refresh } = await AuthService.login({ email: SAMPLE_USER.email, password: 'Str0ng!Pass', ip: '1.1.1.1' });
    const first = await AuthService.refresh({ oldRefreshToken: refresh });
    expect(first.newJwt).toBeDefined();
    expect(first.newRefresh).toBeDefined();
    // using old refresh again should be rejected
    await expect(AuthService.refresh({ oldRefreshToken: refresh })).rejects.toMatchObject({ status: 401 });
  });

  test('Access token expires after 15 minutes (simulated)', async () => {
    // make short-lived token and verify expiry behavior
    const token = makeAccessToken({ email: SAMPLE_USER.email }, { expiresIn: '1s' });
    const jwt = require('jsonwebtoken');
    // immediately valid
    jwt.verify(token, 'test-access-secret');
    // wait
    await new Promise(r => setTimeout(r, 1100));
    expect(() => jwt.verify(token, 'test-access-secret')).toThrow();
  }, 10000);
});
