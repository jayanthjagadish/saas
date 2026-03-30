# Logout Implementation (US-003) ✅

## Summary
Implemented POST /auth/logout endpoint with session revocation, token clearing, and comprehensive test coverage.

## Files Modified

### 1. packages/api/src/services/auth.ts
**Added Function:**
- `revokeSession(sessionId: string): Promise<void>`
  - Finds session by ID
  - Checks if already revoked (prevents double logout)
  - Marks session as revoked in DB
  - Throws AppError with appropriate error codes

**Updated Export:**
- Added `revokeSession` to default export

### 2. packages/api/src/routes/auth.ts
**Added Imports:**
- `verifyRefreshToken, revokeSession` from services/auth.js
- `authMiddleware, AuthRequest` from middleware/auth.js

**Added Endpoint:**
- POST /auth/logout (protected with authMiddleware)
  - Extracts refresh_token from httpOnly cookie
  - Verifies refresh token to get sessionId
  - Revokes session using `revokeSession()`
  - Clears refresh_token cookie (httpOnly, secure, sameSite=lax)
  - Returns 200 OK with success message
  - Error handling for missing token, invalid token, and already-revoked sessions

### 3. tests/api/auth.logout.test.ts
**Updated Tests:**
- ✅ Happy path: Logout revokes session successfully
- ✅ Error path: Double logout returns 401 (SESSION_REVOKED)
- ✅ Integration: After logout, refresh with old session fails

## Acceptance Criteria Met

✅ **Revokes the user's current session**
   - Session.revoked flag set to true
   - Prevents reuse of token with that session ID

✅ **Returns 200 OK**
   - Response: { success: true, message: 'Logged out successfully' }

✅ **Next refresh attempt with old token fails**
   - /refresh endpoint checks session.revoked flag
   - Returns 401 if revoked or not found

✅ **Tests cover happy path + error path**
   - Happy path: Successful logout
   - Error path: Double logout returns 401

## Behavior

### Success Case (200)
```
POST /auth/logout
Authorization: Bearer {access_token}
Cookie: refresh_token={token}

Response:
{
  "success": true,
  "message": "Logged out successfully"
}

Cookie cleared: refresh_token (httpOnly cleared)
```

### Error Cases (401)
- Missing refresh token: `MISSING_TOKEN`
- Invalid refresh token: `INVALID_REFRESH_TOKEN`
- Session already revoked: `SESSION_REVOKED`
- Session not found: (caught as LOGOUT_FAILED)

## Integration Points
- Uses existing `authMiddleware` for user context
- Uses existing `verifyRefreshToken()` to extract sessionId
- Uses `Session` model directly (leverages existing schema)
- Follows existing error handling patterns (AppError)
- Follows existing cookie patterns (httpOnly, secure, sameSite)

## Security Features
- ✅ Protected endpoint (requires valid access token)
- ✅ httpOnly cookie (prevents XSS token theft)
- ✅ Secure flag in production
- ✅ SameSite=lax (CSRF protection)
- ✅ Session-based token revocation (not blacklist)
- ✅ Prevents double logout attacks
