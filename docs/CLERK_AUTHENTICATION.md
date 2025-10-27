# Clerk Authentication Guide

**Last Updated:** October 27, 2025  
**Status:** Active in Production

---

## Overview

TERP uses [Clerk](https://clerk.com) for authentication and user management. Clerk provides a complete authentication solution with:

- Email/password authentication
- Social login (Google, GitHub, etc.)
- Multi-factor authentication (MFA)
- User management dashboard
- Session management
- No IP restrictions (works with DigitalOcean)

---

## Architecture

### Backend Integration

**File:** `server/_core/clerkAuth.ts`

The backend uses a custom `ClerkAuthService` class that:
1. Creates and signs JWT session tokens
2. Verifies session tokens from cookies
3. Authenticates requests via `authenticateRequest()`
4. Syncs users with local database
5. Handles Clerk webhooks for user events

**Key Methods:**
```typescript
class ClerkAuthService {
  // Create a session token for a user
  async createSessionToken(userId: string, options?: {...}): Promise<string>
  
  // Sign a session with JWT
  async signSession(payload: SessionPayload, options?: {...}): Promise<string>
  
  // Verify a session token from cookie
  async verifySession(cookieValue: string): Promise<SessionPayload | null>
  
  // Authenticate an Express request
  async authenticateRequest(req: Request): Promise<User>
}
```

### Frontend Integration

**File:** `client/src/main.tsx`

The frontend wraps the entire app with `ClerkProvider`:

```typescript
import { ClerkProvider } from "@clerk/clerk-react";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPublishableKey}>
    <App />
  </ClerkProvider>
);
```

**Sign-In Page:** `client/src/pages/SignIn.tsx`
```typescript
import { SignIn as ClerkSignIn } from "@clerk/clerk-react";

export default function SignIn() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <ClerkSignIn 
        routing="path" 
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/"
      />
    </div>
  );
}
```

**Sign-Up Page:** `client/src/pages/SignUp.tsx`
```typescript
import { SignUp as ClerkSignUp } from "@clerk/clerk-react";

export default function SignUp() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <ClerkSignUp 
        routing="path" 
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/"
      />
    </div>
  );
}
```

---

## Authentication Flow

### User Sign-In Process

1. **User visits protected route** (e.g., `/dashboard`)
2. **`useAuth` hook checks authentication**
   - Calls `trpc.auth.me.useQuery()`
   - Backend verifies session cookie
3. **If not authenticated:**
   - Redirect to `/sign-in`
   - Clerk displays sign-in UI
4. **User enters credentials**
   - Clerk validates credentials
   - Creates Clerk session
5. **Post-authentication:**
   - Clerk redirects to `/api/auth/callback?userId={clerkUserId}`
   - Backend fetches user from Clerk API
   - Backend syncs user to local database
   - Backend creates JWT session token
   - Backend sets session cookie
   - Backend redirects to `/`
6. **User accesses protected routes**
   - Session cookie sent with each request
   - Backend verifies JWT and loads user
   - User data available in tRPC context

### Session Management

**Cookie Name:** `manus-session` (from `@shared/const.ts`)

**Session Payload:**
```typescript
{
  openId: string;    // Clerk user ID
  appId: string;     // App identifier
  name: string;      // User's full name
}
```

**Session Duration:** 1 year (configurable via `ONE_YEAR_MS`)

**Security:**
- JWT signed with `JWT_SECRET` environment variable
- HS256 algorithm
- Expiration time embedded in token
- Verified on every request

---

## Environment Variables

### Backend (Runtime)
```bash
CLERK_SECRET_KEY=sk_test_gLGRGGDzMjmxvYMdxTfPuRQQeUMpvbOQkJBKBJCZBD
JWT_SECRET=Ul/Ynqm7joZMzI4pTm+giIjfu+TF6MUUUqL020FNq2M=
```

### Frontend (Build Time)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlYXItY2FyZGluYWwtNjMuY2xlcmsuYWNjb3VudHMuZGV2JA
VITE_APP_ID=terp-app
```

---

## Clerk Dashboard

### Access
**URL:** https://dashboard.clerk.com  
**Application:** clear-cardinal-63.clerk.accounts.dev

### Features
- **Users:** View, edit, and delete users
- **Sessions:** Monitor active sessions
- **Organizations:** Manage organizations (if enabled)
- **Authentication:** Configure sign-in methods
- **Webhooks:** Set up event notifications
- **API Keys:** Manage publishable and secret keys
- **Branding:** Customize sign-in/sign-up UI

### Webhooks

**Endpoint:** `https://terp-app-b9s35.ondigitalocean.app/api/clerk/webhook`

**Events:**
- `user.created` - Sync new user to database
- `user.updated` - Update user in database

**Implementation:**
```typescript
app.post("/api/clerk/webhook", async (req: Request, res: Response) => {
  const event = req.body;
  
  if (event.type === "user.created" || event.type === "user.updated") {
    const user = event.data;
    await db.upsertUser({
      openId: user.id,
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || null,
      email: user.email_addresses?.[0]?.email_address || null,
      loginMethod: "clerk",
      lastSignedIn: new Date(),
    });
  }
  
  res.json({ success: true });
});
```

---

## User Database Schema

**Table:** `users`

```sql
CREATE TABLE users (
  open_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  login_method VARCHAR(50),
  last_signed_in DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Sync Process:**
1. User signs in via Clerk
2. Backend receives Clerk user ID
3. Backend checks if user exists in local database
4. If not exists, fetch user details from Clerk API
5. Insert/update user in local database
6. Return user object for tRPC context

---

## Development Setup

### Local Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set environment variables in `.env`:**
   ```bash
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlYXItY2FyZGluYWwtNjMuY2xlcmsuYWNjb3VudHMuZGV2JA
   CLERK_SECRET_KEY=sk_test_gLGRGGDzMjmxvYMdxTfPuRQQeUMpvbOQkJBKBJCZBD
   JWT_SECRET=your-jwt-secret-here
   DATABASE_URL=mysql://user:pass@localhost:3306/terp
   ```

3. **Run development server:**
   ```bash
   pnpm dev
   ```

4. **Test authentication:**
   - Visit http://localhost:3000/sign-in
   - Create a test account
   - Verify redirect to dashboard

### Testing Authentication

**Manual Testing:**
1. Sign up with test email
2. Verify email (if required)
3. Sign in
4. Check session cookie in browser DevTools
5. Access protected routes
6. Sign out
7. Verify redirect to sign-in page

**Automated Testing:**
```typescript
// Test session creation
const token = await clerkAuth.createSessionToken("user_123", {
  name: "Test User"
});
expect(token).toBeTruthy();

// Test session verification
const session = await clerkAuth.verifySession(token);
expect(session?.openId).toBe("user_123");
```

---

## Migration from Butterfly Effect OAuth

### What Changed

**Removed:**
- `server/_core/oauth.ts` - Old OAuth routes
- `server/_core/sdk.ts` - OAuth SDK (kept for reference)
- Environment variables: `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`

**Added:**
- `server/_core/clerkAuth.ts` - Clerk authentication service
- `client/src/pages/SignIn.tsx` - Clerk sign-in page
- `client/src/pages/SignUp.tsx` - Clerk sign-up page
- Environment variables: `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`

**Modified:**
- `server/_core/index.ts` - Use `registerClerkOAuthRoutes` instead of `registerOAuthRoutes`
- `server/_core/context.ts` - Use `clerkAuth.authenticateRequest` instead of `sdk.authenticateRequest`
- `client/src/main.tsx` - Wrap app with `ClerkProvider`
- `client/src/const.ts` - Update `getLoginUrl()` to return `/sign-in`
- `client/src/App.tsx` - Add routes for `/sign-in` and `/sign-up`

### Why Migrate?

**Problem:**
Butterfly Effect OAuth server had IP restrictions that blocked DigitalOcean's IP addresses. Users could not authenticate when accessing the deployed application.

**Error:**
```
IP address not allowed from 04123
```

**Solution:**
Clerk has no IP restrictions and works seamlessly with DigitalOcean. It also provides a free tier with generous limits.

---

## Troubleshooting

### Common Issues

**1. "Missing Clerk Publishable Key" Error**
- **Cause:** `VITE_CLERK_PUBLISHABLE_KEY` not set
- **Fix:** Add to `.env` and rebuild frontend

**2. Authentication Fails Silently**
- **Cause:** `CLERK_SECRET_KEY` incorrect or missing
- **Fix:** Verify secret key in DigitalOcean environment variables

**3. User Not Syncing to Database**
- **Cause:** Database connection issue or webhook not configured
- **Fix:** Check `DATABASE_URL` and verify webhook endpoint

**4. Session Expires Immediately**
- **Cause:** `JWT_SECRET` mismatch or clock skew
- **Fix:** Ensure same `JWT_SECRET` across all instances

**5. Redirect Loop on Sign-In**
- **Cause:** Incorrect redirect URLs in Clerk dashboard
- **Fix:** Set `afterSignInUrl="/"` in `<SignIn>` component

### Debug Mode

**Enable Clerk Debug Logging:**
```typescript
// In main.tsx
<ClerkProvider 
  publishableKey={clerkPublishableKey}
  debug={true}
>
```

**Check Backend Logs:**
```bash
# DigitalOcean logs
curl -H "Authorization: Bearer $DO_API_TOKEN" \
  "https://api.digitalocean.com/v2/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/deployments/{deployment_id}/logs"
```

---

## Security Best Practices

1. **Never commit secrets to Git**
   - Use environment variables
   - Add `.env` to `.gitignore`

2. **Rotate keys regularly**
   - Generate new secret keys periodically
   - Update in DigitalOcean and Clerk dashboard

3. **Use HTTPS only**
   - DigitalOcean provides automatic SSL
   - Never disable SSL in production

4. **Validate session on every request**
   - Don't trust client-side state
   - Always verify JWT signature

5. **Implement rate limiting**
   - Prevent brute force attacks
   - Use Clerk's built-in rate limiting

6. **Monitor authentication logs**
   - Check Clerk dashboard regularly
   - Set up alerts for suspicious activity

---

## API Reference

### Backend Routes

**POST /api/clerk/webhook**
- Receives Clerk webhook events
- Syncs user data to local database
- Returns: `{ success: true }`

**GET /api/auth/callback**
- Handles post-authentication redirect
- Creates session token
- Sets session cookie
- Redirects to `/`

**GET /api/auth/health**
- Health check endpoint
- Returns: `{ status: "ok", provider: "clerk", publishableKey: "configured" }`

### tRPC Procedures

**auth.me**
- Returns current user or null
- Uses session cookie for authentication
- Example: `const { data: user } = trpc.auth.me.useQuery()`

**auth.logout**
- Clears session cookie
- Invalidates session
- Example: `await trpc.auth.logout.mutate()`

---

## Resources

### Official Documentation
- **Clerk Docs:** https://clerk.com/docs
- **Clerk React SDK:** https://clerk.com/docs/references/react/overview
- **Clerk Backend SDK:** https://clerk.com/docs/references/backend/overview

### Support
- **Clerk Support:** support@clerk.com
- **Clerk Discord:** https://clerk.com/discord
- **GitHub Issues:** https://github.com/clerkinc/javascript

---

**Authentication Status:** ✅ Active and Working  
**Last Tested:** October 27, 2025  
**Next Review:** As needed

