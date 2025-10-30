# Authentication Context Fixes - Implementation Guide

**Priority:** 🔴 CRITICAL (Security)
**Effort:** 1 day
**Impact:** Security vulnerability, audit trail corruption

---

## Problem Overview

Multiple components use hardcoded `userId: 1` instead of getting the actual authenticated user from context. This creates:

1. **Security Risk:** Bypasses authentication checks
2. **Audit Trail Corruption:** All actions appear to come from user 1
3. **Multi-user Issues:** Cannot support multiple real users

### Affected Locations (7 files)

```typescript
// ❌ All using hardcoded userId: 1
client/src/components/inventory/ClientInterestWidget.tsx:42
client/src/components/needs/ClientNeedsTab.tsx:70
client/src/components/needs/ClientNeedsTab.tsx:91
client/src/components/dashboard/widgets-v2/TemplateSelector.tsx:30
```

---

## Current Authentication Setup Analysis

### Backend Authentication

**File:** `server/_core/simpleAuth.ts`

```typescript
// Backend already has auth working
export const simpleAuth = {
  async createUser(email: string, password: string, name?: string) { /* ... */ },
  async validateUser(email: string, password: string) { /* ... */ },
  async getUserByToken(token: string) { /* ... */ },
};
```

**File:** `server/_core/context.ts`

```typescript
// Context creation - already extracts user
export const createContext = async ({ req, res }: CreateContextOptions) => {
  // Gets user from JWT token
  const token = req.cookies['manus-session'];
  let user = null;
  if (token) {
    user = await simpleAuth.getUserByToken(token);
  }
  return { req, res, user };
};
```

**Status:** ✅ Backend auth is working correctly

---

### Frontend Authentication Status

**Current State:**
- Login page exists: `client/src/pages/Login.tsx`
- No auth context provider
- No hook to access current user
- Components hardcode userId

**What's Missing:**
1. Auth context provider
2. `useAuth()` hook
3. Protected route wrapper
4. User state management

---

## Implementation Strategy

### Phase 1: Create Auth Context (2 hours)

#### 1.1 Create Auth Context Provider

**File:** `client/src/contexts/AuthContext.tsx` (NEW)

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import Cookies from 'js-cookie';

interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verify session on mount
  useEffect(() => {
    const token = Cookies.get('manus-session');
    if (token) {
      // Verify token with backend
      verifySession();
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifySession = async () => {
    try {
      // Call backend to verify token and get user
      const response = await fetch('/api/auth/verify', {
        credentials: 'include',
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      Cookies.remove('manus-session');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const userData = await response.json();
    setUser(userData);
  };

  const logout = () => {
    Cookies.remove('manus-session');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

#### 1.2 Add Auth Provider to App

**File:** `client/src/main.tsx`

```typescript
// Add AuthProvider
import { AuthProvider } from './contexts/AuthContext';

// Wrap App
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <App />
  </AuthProvider>
</QueryClientProvider>
```

---

#### 1.3 Add Session Verification Endpoint

**File:** `server/_core/simpleAuth.ts`

```typescript
// Add to existing simpleAuth object
export const simpleAuth = {
  // ... existing methods ...

  async verifySession(token: string) {
    try {
      const decoded = await jwtVerify(token, JWT_SECRET);
      const userId = decoded.payload.sub as number;
      return await getUserById(userId);
    } catch (error) {
      return null;
    }
  },
};
```

**File:** `server/_core/index.ts`

```typescript
// Add verification endpoint
app.get('/api/auth/verify', async (req, res) => {
  const token = req.cookies['manus-session'];
  if (!token) {
    return res.status(401).json({ error: 'No session' });
  }

  const user = await simpleAuth.verifySession(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});
```

---

### Phase 2: Update Components (3 hours)

#### 2.1 Replace Hardcoded User IDs

**Pattern to Apply:**

```typescript
// ❌ BEFORE
import { trpc } from '@/lib/trpc';

function MyComponent() {
  const createNeed = trpc.clientNeeds.create.useMutation();

  const handleCreate = () => {
    createNeed.mutate({
      clientId: 123,
      // ... other fields
      createdBy: 1, // ❌ HARDCODED
    });
  };
}

// ✅ AFTER
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user } = useAuth();
  const createNeed = trpc.clientNeeds.create.useMutation();

  const handleCreate = () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    createNeed.mutate({
      clientId: 123,
      // ... other fields
      createdBy: user.id, // ✅ FROM AUTH CONTEXT
    });
  };
}
```

---

#### 2.2 Update Each Affected File

**File 1:** `client/src/components/inventory/ClientInterestWidget.tsx`

**Line 42:**
```typescript
// ❌ BEFORE
const recordInterest = trpc.inventory.recordClientInterest.useMutation();

onClick={() =>
  recordInterest.mutate({
    batchId: batch.id,
    clientId: client.id,
    userId: 1, // ❌ HARDCODED
  })
}

// ✅ AFTER
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();
const recordInterest = trpc.inventory.recordClientInterest.useMutation();

onClick={() => {
  if (!user) return;
  recordInterest.mutate({
    batchId: batch.id,
    clientId: client.id,
    userId: user.id, // ✅ FROM CONTEXT
  })
}}
```

---

**File 2:** `client/src/components/needs/ClientNeedsTab.tsx`

**Lines 70, 91:**
```typescript
// ❌ BEFORE
const createNeed = trpc.clientNeeds.create.useMutation();
const createAndMatch = trpc.clientNeeds.createAndFindMatches.useMutation();

// Line 70
createNeed.mutate({
  clientId,
  strain,
  // ...
  createdBy: 1, // ❌ HARDCODED
});

// Line 91
createAndMatch.mutate({
  clientId,
  strain,
  // ...
  userId: 1, // ❌ HARDCODED
});

// ✅ AFTER
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();
const createNeed = trpc.clientNeeds.create.useMutation();
const createAndMatch = trpc.clientNeeds.createAndFindMatches.useMutation();

// Guard at component level
if (!user) {
  return <div>Please log in</div>;
}

// Line 70
createNeed.mutate({
  clientId,
  strain,
  // ...
  createdBy: user.id, // ✅ FROM CONTEXT
});

// Line 91
createAndMatch.mutate({
  clientId,
  strain,
  // ...
  userId: user.id, // ✅ FROM CONTEXT
});
```

---

**File 3:** `client/src/components/dashboard/widgets-v2/TemplateSelector.tsx`

**Line 30:**
```typescript
// ❌ BEFORE
id: "TODO",

// ✅ AFTER - This seems to be template ID, not user ID
// Review the context - if it's meant to be user-specific:
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();
const templateId = `template-${user?.id || 'default'}`;
```

**Note:** Review line 30 context - might not be user ID related.

---

### Phase 3: Protected Routes (1 hour)

#### 3.1 Create Protected Route Wrapper

**File:** `client/src/components/ProtectedRoute.tsx` (NEW)

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'wouter';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}
```

---

#### 3.2 Wrap Protected Routes

**File:** `client/src/App.tsx`

```typescript
import { ProtectedRoute } from './components/ProtectedRoute';

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />

      {/* Protected routes */}
      <Route>
        {() => (
          <ProtectedRoute>
            <AppShell>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/inventory" component={Inventory} />
                {/* ... all other routes ... */}
              </Switch>
            </AppShell>
          </ProtectedRoute>
        )}
      </Route>
    </Switch>
  );
}
```

---

### Phase 4: Update Login Page (30 minutes)

#### 4.1 Connect Login to Auth Context

**File:** `client/src/pages/Login.tsx`

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useState } from 'react';

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      setLocation('/'); // Redirect to dashboard
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <h2 className="text-3xl font-bold text-center">Sign In to TERP</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### Phase 5: Header User Display (30 minutes)

#### 5.1 Add User Info to Header

**File:** `client/src/components/layout/AppHeader.tsx`

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User } from 'lucide-react';

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="text-xl font-bold">TERP</div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-2" />
                {user.name || user.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
```

---

## Testing Checklist

### 1. Auth Flow Test
```bash
# Test login
✅ Visit /login
✅ Enter credentials (Evan / oliver)
✅ Verify redirect to dashboard
✅ Check user info in header

# Test logout
✅ Click logout in header dropdown
✅ Verify redirect to login
✅ Verify cannot access protected routes

# Test session persistence
✅ Login
✅ Refresh page
✅ Verify still logged in
```

### 2. Component Tests
```bash
# For each updated component:
✅ ClientInterestWidget - creates with correct user
✅ ClientNeedsTab - creates needs with correct user
✅ Verify audit logs show correct user IDs
```

### 3. API Tests
```bash
# Test protected endpoints
✅ Access without token → 401
✅ Access with token → 200 with user data
✅ Invalid token → 401
```

### 4. Security Tests
```bash
# Test authorization
✅ User cannot access admin-only features
✅ Cannot forge user ID in requests
✅ Session expires appropriately
```

---

## Dependencies

### Install if needed:
```bash
pnpm add js-cookie
pnpm add -D @types/js-cookie
```

---

## Migration Strategy

### Option A: Big Bang (Recommended for small team)
1. Implement all auth context in feature branch
2. Update all components at once
3. Test thoroughly
4. Merge when complete

### Option B: Gradual Migration
1. Add auth context (non-breaking)
2. Update components one by one
3. Keep hardcoded fallback until all done
4. Remove fallbacks in final PR

---

## Rollback Plan

If issues arise:
1. Auth context is additive (doesn't break existing)
2. Can temporarily add fallback:
   ```typescript
   const userId = user?.id || 1; // Temporary fallback
   ```
3. Fix issues before removing fallback

---

## Success Criteria

✅ All components use `useAuth()` hook
✅ No hardcoded `userId: 1` in codebase
✅ Login/logout flow works
✅ Session persists across refreshes
✅ Protected routes redirect to login
✅ Audit logs show correct user IDs
✅ All tests pass

---

## Notes for AI Developer

### Flexibility Points
- **Auth Provider:** Can use different state management (Zustand, etc.)
- **Session Storage:** Can use localStorage instead of cookies
- **UI Components:** Adjust login UI to match design system
- **Error Handling:** Add more robust error handling as needed

### Things to Consider
- **Role-based Access:** May want to add role checks
- **Token Refresh:** Consider adding token refresh logic
- **Logout Everywhere:** Consider adding logout from all devices
- **Remember Me:** Consider adding remember me functionality

### Existing Code
- Backend auth (`simpleAuth.ts`) is solid - don't change it
- Login page exists - just needs connection to context
- Protected procedure pattern works well - use it

---

## Estimated Timeline

- **Hour 1-2:** Create auth context and provider
- **Hour 3:** Add session verification endpoint
- **Hour 4-6:** Update all 7 affected components
- **Hour 7:** Add protected routes
- **Hour 8:** Testing and verification

**Total: 1 day (8 hours)**
