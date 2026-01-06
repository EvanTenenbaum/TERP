# Agent Prompt: Admin & User Account UX Improvements

**Task ID:** ADMIN-USER-UX  
**Priority:** P0-P2 (Mixed)  
**Total Estimate:** 48 hours  
**Tasks:** SEC-010, UX-050, UX-051, UX-052, UX-053, UX-054, UX-055

---

## 🚀 New Agent Onboarding

### Step 1: Clone and Setup

```bash
# Clone the repository
gh repo clone EvanTenenbaum/TERP
cd TERP

# Install dependencies
pnpm install

# Verify environment
pnpm check  # Must pass with 0 errors
```

### Step 2: Register Your Session

```bash
# Create session file
SESSION_ID="Session-$(date +%Y%m%d)-ADMIN-USER-UX-$(openssl rand -hex 4)"
cp docs/templates/SESSION_TEMPLATE.md "docs/sessions/active/${SESSION_ID}.md"

# Edit the session file with your details
# Then register in ACTIVE_SESSIONS.md
echo "- ADMIN-USER-UX: ${SESSION_ID} ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md

# Commit and push immediately
git add docs/sessions/active/${SESSION_ID}.md docs/ACTIVE_SESSIONS.md
git commit -m "Register session for ADMIN-USER-UX"
git push origin main
```

### Step 3: Understand the Codebase

**Key Files You'll Be Working With:**

| File                                                         | Purpose                                   |
| ------------------------------------------------------------ | ----------------------------------------- |
| `server/routers/userManagement.ts`                           | User CRUD endpoints (SECURITY FIX NEEDED) |
| `client/src/components/UserManagement.tsx`                   | Admin user management UI                  |
| `client/src/pages/Settings.tsx`                              | Settings page container                   |
| `client/src/components/layout/AppHeader.tsx`                 | Header with user menu                     |
| `client/src/pages/settings/NotificationPreferences.tsx`      | Notification settings                     |
| `client/src/components/settings/rbac/UserRoleManagement.tsx` | Role assignment UI                        |

**New Files You'll Create:**

| File                                                      | Purpose                |
| --------------------------------------------------------- | ---------------------- |
| `client/src/pages/AccountPage.tsx`                        | New My Account page    |
| `client/src/components/account/ProfileSection.tsx`        | Profile info component |
| `client/src/components/account/PasswordChangeSection.tsx` | Password change form   |
| `client/src/components/account/SessionsSection.tsx`       | Active sessions list   |
| `client/src/components/admin/UserAuditTimeline.tsx`       | Audit log component    |

---

## 📋 Task Overview

You are implementing Admin & User Account UX improvements. This is a focused, incremental improvement - **NOT a major overhaul**.

### Core Problems to Solve

1. **CRITICAL SECURITY:** `userManagement.ts` exposes CRUD as `publicProcedure` - must be secured
2. Admin user management uses blocking `alert()` calls, has no search/filter
3. No dedicated "My Account" page for end users
4. Notification preferences lack polish (no loading states, no save confirmation)
5. Fragmented workflow between user list and role assignment

---

## 🔴 Phase 1: Security First (4h)

### SEC-010: Secure User Management Endpoints

**CRITICAL - Do this first before any UI work**

**Current State (INSECURE):**

```typescript
// server/routers/userManagement.ts - CURRENT (BAD)
export const userManagementRouter = router({
  create: publicProcedure  // ❌ NO AUTH CHECK
    .input(...)
    .mutation(...),
  delete: publicProcedure  // ❌ NO AUTH CHECK
    .input(...)
    .mutation(...),
});
```

**Required State (SECURE):**

```typescript
// server/routers/userManagement.ts - FIXED
import { protectedProcedure, requirePermission } from '../trpc';
import { auditService } from '../services/auditService';

export const userManagementRouter = router({
  create: protectedProcedure
    .use(requirePermission('users:manage'))
    .input(...)
    .mutation(async ({ ctx, input }) => {
      // ... create user logic
      await auditService.log({
        action: 'user.create',
        actorId: ctx.user.id,
        targetId: newUser.id,
        metadata: { email: input.email }
      });
      return newUser;
    }),

  delete: protectedProcedure
    .use(requirePermission('users:manage'))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Check if this is the last admin
      const adminCount = await db.select({ count: count() })
        .from(users)
        .where(eq(users.role, 'admin'));

      if (adminCount[0].count <= 1) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete the last admin user'
        });
      }

      // ... delete logic
      await auditService.log({
        action: 'user.delete',
        actorId: ctx.user.id,
        targetId: input.id,
      });
    }),
});
```

**Acceptance Criteria:**

- [ ] All endpoints use `protectedProcedure`
- [ ] Permission check `users:manage` enforced
- [ ] Last admin deletion prevented
- [ ] Audit trail for all user lifecycle actions
- [ ] Structured error responses (not generic 500s)

---

## 🟡 Phase 2: Admin Hardening (12h)

### UX-050: Harden Admin User Management UI (8h)

**Current Problems:**

- Uses `alert()` and `confirm()` for feedback
- No search or filter capability
- No pagination
- No role badges or last login info
- Weak confirmation for destructive actions

**Implementation:**

```typescript
// client/src/components/UserManagement.tsx

// 1. Replace alert() with toast
import { toast } from "sonner";

// BAD:
alert("User created successfully");

// GOOD:
toast.success("User created successfully");

// 2. Add search/filter state
const [searchQuery, setSearchQuery] = useState("");
const [roleFilter, setRoleFilter] = useState<string | null>(null);
const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | null>(
  null
);

// 3. Add pagination
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);

// 4. Filter users
const filteredUsers = useMemo(() => {
  return users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !roleFilter || user.roles?.includes(roleFilter);
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" ? !user.deletedAt : !!user.deletedAt);
    return matchesSearch && matchesRole && matchesStatus;
  });
}, [users, searchQuery, roleFilter, statusFilter]);

// 5. Rich confirmation dialog
const [deleteConfirm, setDeleteConfirm] = useState<{
  open: boolean;
  user: User | null;
  reason: string;
}>({ open: false, user: null, reason: "" });

// 6. Post-create role assignment CTA
const [showAssignRole, setShowAssignRole] = useState<number | null>(null);
```

**UI Components to Add:**

- Search input with debounce
- Role filter dropdown
- Status filter (Active/Inactive)
- Pagination controls (10/25/50 per page)
- Role badges in user rows
- Last login column
- Confirmation dialog with user details
- "Assign Role" button after creation

### UX-052: Bridge User List to Role Assignment (4h)

**Implementation:**

```typescript
// In UserManagement.tsx - Add action button
<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    // Navigate to RBAC with user pre-selected
    navigate(`/settings/rbac?userId=${user.id}`);
  }}
>
  <Shield className="h-4 w-4 mr-1" />
  Manage Roles
</Button>

// Show current roles inline
<div className="flex gap-1">
  {user.roles?.map(role => (
    <Badge key={role} variant="secondary">{role}</Badge>
  ))}
  {(!user.roles || user.roles.length === 0) && (
    <Badge variant="destructive">No roles</Badge>
  )}
</div>
```

**In UserRoleManagement.tsx:**

```typescript
// Read userId from URL params
const [searchParams] = useSearchParams();
const preselectedUserId = searchParams.get("userId");

// Pre-filter to that user if provided
useEffect(() => {
  if (preselectedUserId) {
    setSelectedUser(parseInt(preselectedUserId));
    // Scroll to user section
    userSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }
}, [preselectedUserId]);
```

---

## 🟡 Phase 3: User Self-Service (18h)

### UX-051: Add My Account/Profile Page (12h)

**Create new route and page:**

```typescript
// client/src/App.tsx - Add route
<Route path="/account" element={<AccountPage />} />

// client/src/pages/AccountPage.tsx
import { ProfileSection } from '@/components/account/ProfileSection';
import { PasswordChangeSection } from '@/components/account/PasswordChangeSection';
import { SessionsSection } from '@/components/account/SessionsSection';

export function AccountPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-8">My Account</h1>

      <div className="space-y-8">
        <ProfileSection />
        <PasswordChangeSection />
        <SessionsSection />

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/settings/notifications" className="text-primary hover:underline">
              Manage notification preferences →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**ProfileSection.tsx:**

```typescript
export function ProfileSection() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const updateProfile = trpc.auth.updateProfile.useMutation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ name, email });
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  if (isLoading) return <ProfileSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <Button onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**PasswordChangeSection.tsx:**

```typescript
export function PasswordChangeSection() {
  const changePassword = trpc.auth.changePassword.useMutation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!currentPassword) newErrors.currentPassword = 'Current password is required';
    if (newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Failed to change password. Check your current password.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
          />
          {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword}</p>}
        </div>
        <div>
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">Must be at least 8 characters</p>
          {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
        </div>
        <Button onClick={handleSubmit} disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Changing...' : 'Change Password'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Update AppHeader.tsx:**

```typescript
// Replace current user menu with dropdown
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="flex items-center gap-2">
      <User className="h-4 w-4" />
      <span>{user?.name || user?.email}</span>
      <ChevronDown className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => navigate('/account')}>
      <User className="h-4 w-4 mr-2" />
      My Account
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate('/settings/notifications')}>
      <Bell className="h-4 w-4 mr-2" />
      Notifications
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleLogout}>
      <LogOut className="h-4 w-4 mr-2" />
      Sign Out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### UX-053: Polish Notification Preferences (6h)

**Enhancements to NotificationPreferences.tsx:**

```typescript
export function NotificationPreferences() {
  const { data: prefs, isLoading, error, refetch } = trpc.notifications.getPreferences.useQuery();
  const updatePrefs = trpc.notifications.updatePreferences.useMutation();

  const [localPrefs, setLocalPrefs] = useState(prefs);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (prefs) {
      setLocalPrefs(prefs);
      setHasChanges(false);
    }
  }, [prefs]);

  const handleChange = (key: string, value: boolean) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updatePrefs.mutateAsync(localPrefs);
      toast.success('Preferences saved');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save preferences');
    }
  };

  const handleRestoreDefaults = async () => {
    // Reset to defaults
    const defaults = { /* default values */ };
    setLocalPrefs(defaults);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load preferences</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {hasChanges && (
        <Alert>
          <AlertTitle>Unsaved changes</AlertTitle>
          <AlertDescription>You have unsaved changes to your notification preferences.</AlertDescription>
        </Alert>
      )}

      {/* Preference toggles */}

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={!hasChanges || updatePrefs.isPending}>
          {updatePrefs.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
        <Button variant="outline" onClick={handleRestoreDefaults}>
          Restore Defaults
        </Button>
      </div>

      {prefs?.updatedAt && (
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date(prefs.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
```

---

## 🟢 Phase 4: Polish & Audit (14h)

### UX-054: Standardize Feedback and Accessibility (8h)

**Checklist:**

- [ ] All submit buttons show loading state during mutations
- [ ] Buttons disabled during pending operations
- [ ] Inline validation messages appear near fields
- [ ] Focus returns to trigger element after dialog closes
- [ ] Visible focus rings on all interactive elements
- [ ] Helper text for password requirements, email format
- [ ] Consistent empty states across all sections

**Pattern to follow:**

```typescript
// Loading state on buttons
<Button disabled={mutation.isPending}>
  {mutation.isPending ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Saving...
    </>
  ) : (
    'Save'
  )}
</Button>

// Inline validation
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? 'email-error' : undefined}
  />
  {errors.email && (
    <p id="email-error" className="text-sm text-destructive mt-1">
      {errors.email}
    </p>
  )}
</div>

// Focus management after dialog
const triggerRef = useRef<HTMLButtonElement>(null);

const handleDialogClose = () => {
  setOpen(false);
  // Return focus to trigger
  setTimeout(() => triggerRef.current?.focus(), 0);
};
```

### UX-055: Surface Audit Trail in Admin UI (6h)

**Create UserAuditTimeline.tsx:**

```typescript
export function UserAuditTimeline({ userId }: { userId: number }) {
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const { data: auditLogs, isLoading } = trpc.audit.getUserHistory.useQuery({
    userId,
    action: actionFilter,
    limit: 50,
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="font-semibold">Activity History</h3>
        <Select value={actionFilter || 'all'} onValueChange={v => setActionFilter(v === 'all' ? null : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="user.create">Created</SelectItem>
            <SelectItem value="user.update">Updated</SelectItem>
            <SelectItem value="user.delete">Deleted</SelectItem>
            <SelectItem value="user.password_reset">Password Reset</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {auditLogs?.map(log => (
          <div key={log.id} className="flex items-start gap-3 p-3 border rounded">
            <div className="flex-1">
              <p className="font-medium">{formatAction(log.action)}</p>
              <p className="text-sm text-muted-foreground">
                by {log.actor?.name || log.actor?.email || 'System'}
              </p>
              {log.reason && (
                <p className="text-sm mt-1">Reason: {log.reason}</p>
              )}
            </div>
            <time className="text-sm text-muted-foreground">
              {new Date(log.createdAt).toLocaleString()}
            </time>
          </div>
        ))}

        {auditLogs?.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No activity recorded</p>
        )}
      </div>
    </div>
  );
}
```

---

## 🔧 Feature Flags

Add these to `server/services/seedFeatureFlags.ts`:

```typescript
{
  key: 'feature-secure-user-management',
  name: 'Secure User Management',
  description: 'Enables protected user management endpoints',
  enabled: true,
  parentKey: null,
},
{
  key: 'feature-admin-user-ux',
  name: 'Admin User UX Improvements',
  description: 'Enables improved admin user management UI',
  enabled: true,
  parentKey: null,
},
{
  key: 'feature-my-account',
  name: 'My Account Page',
  description: 'Enables dedicated account page for users',
  enabled: true,
  parentKey: null,
},
{
  key: 'feature-notification-prefs-polish',
  name: 'Notification Preferences Polish',
  description: 'Enables polished notification preferences UI',
  enabled: true,
  parentKey: null,
},
{
  key: 'feature-admin-audit-ui',
  name: 'Admin Audit UI',
  description: 'Enables audit trail visibility in admin UI',
  enabled: true,
  parentKey: null,
},
```

---

## ✅ Verification Checklist

Before marking complete:

- [ ] `pnpm check` passes with 0 errors
- [ ] `pnpm test` passes
- [ ] All endpoints use `protectedProcedure`
- [ ] No `alert()` or `confirm()` calls remain
- [ ] `/account` page is accessible and functional
- [ ] Header dropdown navigates correctly
- [ ] Search/filter/pagination work in user list
- [ ] Role badges display correctly
- [ ] Audit timeline shows user history
- [ ] All loading states work
- [ ] All error states work
- [ ] Deployment succeeds (check BUILD_STATUS.md)

---

## 📚 Reference Documentation

| Document                                     | Purpose                                           |
| -------------------------------------------- | ------------------------------------------------- |
| `docs/roadmaps/MASTER_ROADMAP.md`            | Task definitions (search for SEC-010, UX-050-055) |
| `docs/protocols/DEVELOPMENT_PROTOCOLS.md`    | Development standards                             |
| `.kiro/steering/01-development-standards.md` | Coding standards                                  |
| `server/trpc.ts`                             | tRPC setup with `protectedProcedure`              |
| `server/services/auditService.ts`            | Audit logging service                             |

---

## 🆘 Escalation

If you encounter blockers:

1. Document in `docs/sessions/active/[your-session]/BLOCKERS.md`
2. Include: file, line, error, what you tried
3. Do NOT add `@ts-nocheck` or `any` types
4. Move to next task and flag for review

---

_Good luck! This is a high-impact improvement that will significantly enhance both admin and user experiences._
