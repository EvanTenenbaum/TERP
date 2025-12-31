# Auth Router

**Path:** `trpc.auth`  
**File:** `server/routers/auth.ts`  
**Permission Required:** None (public procedures)

---

## Overview

The Auth router provides basic authentication state management for the TERP application. It handles session queries and logout functionality. Note that login is handled via a separate HTTP endpoint (`/api/auth/login`), not through tRPC.

---

## Endpoints

### me

Get the currently authenticated user's information.

**Type:** Query  
**Permission:** None (public)

**Input:** None

**Output (Authenticated):**

```typescript
{
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  createdAt: Date;
  lastLoginAt: Date | null;
}
```

**Output (Not Authenticated):**

```typescript
null;
```

**Example:**

```typescript
const { data: user, isLoading } = trpc.auth.me.useQuery();

if (isLoading) {
  return <LoadingSpinner />;
}

if (!user) {
  return <LoginPage />;
}

return <Dashboard user={user} />;
```

**cURL:**

```bash
curl "https://terp-app-b9s35.ondigitalocean.app/api/trpc/auth.me" \
  -H "Cookie: terp_session=..."
```

---

### logout

End the current user's session.

**Type:** Mutation  
**Permission:** None (public, but only affects authenticated users)

**Input:** None

**Output:**

```typescript
{
  success: true;
}
```

**Example:**

```typescript
const logout = trpc.auth.logout.useMutation();

async function handleLogout() {
  await logout.mutateAsync();
  // Redirect to login page
  window.location.href = '/login';
}

return <button onClick={handleLogout}>Logout</button>;
```

**Behavior:**

- Clears the `terp_session` cookie
- Invalidates the server-side session
- Returns success even if no session existed

---

## Login Flow

Login is handled via a traditional HTTP POST endpoint, not tRPC:

**Endpoint:** `POST /api/auth/login`

**Request:**

```bash
curl -X POST "https://terp-app-b9s35.ondigitalocean.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin"
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**Rate Limiting:**

- 5 attempts per 15 minutes per IP
- Lockout after 5 failed attempts

---

## Session Cookie

| Property | Value               |
| -------- | ------------------- |
| Name     | `terp_session`      |
| HttpOnly | `true`              |
| Secure   | `true` (production) |
| SameSite | `Lax`               |
| Max-Age  | 30 days             |
| Path     | `/`                 |

---

## Usage Patterns

### Auth Context Provider

```typescript
import { createContext, useContext, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, refetch } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = async () => {
    await logoutMutation.mutateAsync();
    await refetch();
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Protected Route Component

```typescript
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### Permission Check Hook

```typescript
import { useAuth } from "@/hooks/useAuth";

export function usePermission(permission: string): boolean {
  const { user } = useAuth();

  if (!user) return false;

  // Check for wildcard admin permission
  if (user.permissions.includes("*:*")) return true;

  // Check for resource wildcard (e.g., "orders:*")
  const [resource] = permission.split(":");
  if (user.permissions.includes(`${resource}:*`)) return true;

  // Check for exact permission
  return user.permissions.includes(permission);
}
```

---

## Related Documentation

- [Authentication Guide](../AUTHENTICATION.md) - Complete auth documentation
- [RBAC Users](./rbac-users.md) - User role management
- [RBAC Roles](./rbac-roles.md) - Role configuration
- [RBAC Permissions](./rbac-permissions.md) - Permission management

---

_Documentation generated as part of the Documentation & Testing Infrastructure Sprint_
