# FEAT-023: Implementation Examples

Quick reference for implementing the remaining UI components for FEAT-023.

---

## 1. System Notification Settings Component (Admin Only)

**File:** `/home/user/TERP/client/src/pages/settings/SystemNotificationSettings.tsx`

```tsx
import React from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Bell, Loader2, AlertCircle, Settings, Clock } from "lucide-react";

export function SystemNotificationSettings() {
  const {
    data: systemSettings,
    isLoading,
    refetch,
  } = trpc.notifications.getSystemSettings.useQuery();

  const updateMutation = trpc.notifications.updateSystemSettings.useMutation({
    onSuccess: () => {
      toast.success("System notification settings updated");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to update settings", {
        description: error.message,
      });
    },
  });

  const [localState, setLocalState] = React.useState({
    emailNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    systemAlertsForced: false,
    orderUpdatesDefault: true,
    appointmentRemindersDefault: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    allowUserOverrides: true,
  });

  React.useEffect(() => {
    if (systemSettings) {
      setLocalState(systemSettings);
    }
  }, [systemSettings]);

  const handleSave = () => {
    updateMutation.mutate(localState);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertTitle>System-Wide Configuration</AlertTitle>
        <AlertDescription>
          These settings apply to all users and define the default notification
          behavior across the organization.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Global Channel Settings
          </CardTitle>
          <CardDescription>
            Enable or disable notification channels system-wide
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-global">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Allow email notifications to be sent from the system
              </p>
            </div>
            <Switch
              id="email-global"
              checked={localState.emailNotificationsEnabled}
              onCheckedChange={(checked) =>
                setLocalState((s) => ({
                  ...s,
                  emailNotificationsEnabled: checked,
                }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="inapp-global">In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications within the application interface
              </p>
            </div>
            <Switch
              id="inapp-global"
              checked={localState.inAppNotificationsEnabled}
              onCheckedChange={(checked) =>
                setLocalState((s) => ({
                  ...s,
                  inAppNotificationsEnabled: checked,
                }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-global">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Enable SMS notifications (requires SMS provider configuration)
              </p>
            </div>
            <Switch
              id="sms-global"
              checked={localState.smsNotificationsEnabled}
              onCheckedChange={(checked) =>
                setLocalState((s) => ({
                  ...s,
                  smsNotificationsEnabled: checked,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Notification Categories</CardTitle>
          <CardDescription>
            Set defaults for new users. Existing users are not affected.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="appointment-default">Appointment Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Default enabled for new users
              </p>
            </div>
            <Switch
              id="appointment-default"
              checked={localState.appointmentRemindersDefault}
              onCheckedChange={(checked) =>
                setLocalState((s) => ({
                  ...s,
                  appointmentRemindersDefault: checked,
                }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="order-default">Order Updates</Label>
              <p className="text-sm text-muted-foreground">
                Default enabled for new users
              </p>
            </div>
            <Switch
              id="order-default"
              checked={localState.orderUpdatesDefault}
              onCheckedChange={(checked) =>
                setLocalState((s) => ({ ...s, orderUpdatesDefault: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Controls</CardTitle>
          <CardDescription>
            Enforce specific notification behaviors for all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Critical Settings</AlertTitle>
            <AlertDescription>
              These settings override user preferences. Use with caution.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="force-system-alerts">
                Force System Alerts ON
              </Label>
              <p className="text-sm text-muted-foreground">
                Prevent users from disabling critical system notifications
              </p>
            </div>
            <Switch
              id="force-system-alerts"
              checked={localState.systemAlertsForced}
              onCheckedChange={(checked) =>
                setLocalState((s) => ({ ...s, systemAlertsForced: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-overrides">Allow User Overrides</Label>
              <p className="text-sm text-muted-foreground">
                Let users customize their notification preferences. If disabled,
                all users will use system defaults.
              </p>
            </div>
            <Switch
              id="allow-overrides"
              checked={localState.allowUserOverrides}
              onCheckedChange={(checked) =>
                setLocalState((s) => ({ ...s, allowUserOverrides: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Define hours when notifications should not be sent (applies to email
            and SMS, not in-app)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="quiet-hours-enabled">Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Suppress notifications during specified hours
              </p>
            </div>
            <Switch
              id="quiet-hours-enabled"
              checked={localState.quietHoursEnabled}
              onCheckedChange={(checked) =>
                setLocalState((s) => ({ ...s, quietHoursEnabled: checked }))
              }
            />
          </div>

          {localState.quietHoursEnabled && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Start Time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={localState.quietHoursStart}
                    onChange={(e) =>
                      setLocalState((s) => ({
                        ...s,
                        quietHoursStart: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">End Time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={localState.quietHoursEnd}
                    onChange={(e) =>
                      setLocalState((s) => ({
                        ...s,
                        quietHoursEnd: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Notifications will not be sent between{" "}
                {localState.quietHoursStart} and {localState.quietHoursEnd}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save System Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
```

---

## 2. Enhanced User Preferences Component

**File:** Update `/home/user/TERP/client/src/pages/settings/NotificationPreferences.tsx`

### Key Changes to Make:

#### A. Change Query Hook
```typescript
// OLD:
const { data: preferencesData } = trpc.notifications.getPreferences.useQuery();

// NEW:
const { data: effectivePrefs } = trpc.notifications.getEffectivePreferences.useQuery();
```

#### B. Add Helper Function
```typescript
function getPreferenceState(
  key: PreferenceKey,
  effectivePrefs: ReturnType<typeof trpc.notifications.getEffectivePreferences.useQuery>['data']
) {
  if (!effectivePrefs) return null;

  const isSystemAlertsForced =
    key === 'systemAlerts' && effectivePrefs.systemSettings.systemAlertsForced;

  return {
    isForced: isSystemAlertsForced,
    canModify: effectivePrefs.canCustomize && !isSystemAlertsForced,
    effectiveValue: effectivePrefs.effectivePreferences[key],
    userValue: effectivePrefs.userPreferences[key],
    isUsingDefault: !effectivePrefs.canCustomize,
  };
}
```

#### C. Update Render to Show Badges
```tsx
{controls.map(control => {
  const prefState = getPreferenceState(control.key, effectivePrefs);

  return (
    <div
      key={control.key}
      className="flex items-center justify-between border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Label
            htmlFor={control.key}
            className="text-base font-medium cursor-pointer"
          >
            {control.title}
          </Label>

          {/* Show badge if forced by admin */}
          {prefState?.isForced && (
            <Badge variant="secondary" className="text-xs">
              Required by Admin
            </Badge>
          )}

          {/* Show badge if using system default */}
          {prefState?.isUsingDefault && !prefState?.isForced && (
            <Badge variant="outline" className="text-xs">
              Using System Default
            </Badge>
          )}

          {/* Show badge if system overrode user preference */}
          {prefState?.effectiveValue !== prefState?.userValue &&
            !prefState?.isUsingDefault && (
              <Badge variant="outline" className="text-xs bg-yellow-50">
                System Override
              </Badge>
            )}
        </div>
        <p className="text-sm text-muted-foreground">
          {control.description}
        </p>

        {/* Show why it's disabled */}
        {!prefState?.canModify && (
          <p className="text-xs text-muted-foreground italic">
            {prefState?.isForced
              ? "This setting is required by your administrator"
              : "Customization is disabled by your administrator"}
          </p>
        )}
      </div>

      <Switch
        id={control.key}
        checked={state[control.key]}
        onCheckedChange={handleToggle(control.key)}
        aria-label={control.title}
        disabled={mutation.isPending || !prefState?.canModify}
      />
    </div>
  );
})}
```

#### D. Add System Info Section
```tsx
{/* Add before the controls mapping */}
{effectivePrefs && (
  <>
    {!effectivePrefs.canCustomize && (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Customization Disabled</AlertTitle>
        <AlertDescription>
          Your administrator has disabled notification customization.
          System defaults will be used for all notification preferences.
        </AlertDescription>
      </Alert>
    )}

    {effectivePrefs.systemSettings.quietHoursEnabled && (
      <Alert className="mb-4">
        <Clock className="h-4 w-4" />
        <AlertTitle>Quiet Hours Active</AlertTitle>
        <AlertDescription>
          Email and SMS notifications will not be sent between{" "}
          {effectivePrefs.systemSettings.quietHoursStart} and{" "}
          {effectivePrefs.systemSettings.quietHoursEnd}.
        </AlertDescription>
      </Alert>
    )}
  </>
)}
```

---

## 3. Integration with Settings Page

**File:** `/home/user/TERP/client/src/pages/Settings.tsx`

### Update the Notifications Tab Content:

```tsx
// Replace lines 138-156 with:

<TabsContent value="notifications" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
  {/* Admin: System-wide notification settings */}
  {(isSuperAdmin || hasPermission("admin:settings")) && (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Notification Settings
        </CardTitle>
        <CardDescription>
          Configure organization-wide notification defaults and policies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SystemNotificationSettings />
      </CardContent>
    </Card>
  )}

  {/* All Users: Personal notification preferences */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        My Notification Preferences
      </CardTitle>
      <CardDescription>
        Customize your personal notification settings
      </CardDescription>
    </CardHeader>
    <CardContent>
      <NotificationPreferencesPage />
    </CardContent>
  </Card>
</TabsContent>
```

### Add Import:
```tsx
import { SystemNotificationSettings } from "@/pages/settings/SystemNotificationSettings";
```

---

## 4. Example Test Scenarios

### Scenario 1: Admin Forces System Alerts ON

**Admin Action:**
```typescript
await trpc.notifications.updateSystemSettings.mutate({
  systemAlertsForced: true,
});
```

**User Experience:**
- System Alerts toggle is disabled
- Badge shows "Required by Admin"
- User cannot turn off system alerts
- `effectivePreferences.systemAlerts` is always `true`

### Scenario 2: Admin Disables User Overrides

**Admin Action:**
```typescript
await trpc.notifications.updateSystemSettings.mutate({
  allowUserOverrides: false,
  orderUpdatesDefault: true,
  appointmentRemindersDefault: false,
});
```

**User Experience:**
- All toggles are disabled
- Alert banner shows "Customization Disabled"
- All preferences use system defaults
- User's saved preferences are preserved but not used

### Scenario 3: System Disables Email Globally

**Admin Action:**
```typescript
await trpc.notifications.updateSystemSettings.mutate({
  emailNotificationsEnabled: false,
});
```

**User Experience:**
- Email toggle shows as OFF
- User can toggle it but it has no effect
- `effectivePreferences.emailEnabled` is always `false`
- Badge shows "System Override" if user tried to enable it

---

## 5. Migration Path for Existing Code

### Step 1: Add System Settings Component
```bash
# Create new file
touch client/src/pages/settings/SystemNotificationSettings.tsx

# Copy content from example above
```

### Step 2: Update User Preferences Component
```typescript
// In NotificationPreferences.tsx

// 1. Import Badge component
import { Badge } from "@/components/ui/badge";

// 2. Change query
const { data: effectivePrefs } = trpc.notifications.getEffectivePreferences.useQuery();

// 3. Add helper function (see example above)

// 4. Update render with badges (see example above)
```

### Step 3: Update Settings Page
```typescript
// In Settings.tsx

// 1. Import SystemNotificationSettings
import { SystemNotificationSettings } from "@/pages/settings/SystemNotificationSettings";

// 2. Update notifications tab (see example above)
```

### Step 4: Test
1. Login as admin
2. Go to Settings > Notifications
3. Verify you see "System Notification Settings" card
4. Change system settings
5. Login as regular user
6. Verify badges appear
7. Verify forced settings are disabled

---

## 6. Visual Examples

### Admin View (System Settings)
```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️  System Notification Settings                            │
│ Configure organization-wide notification defaults           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Global Channel Settings                                     │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Email Notifications                        [ON] ●    │   │
│ │ In-App Notifications                       [ON] ●    │   │
│ │ SMS Notifications                          [OFF]     │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ Admin Controls                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ⚠️ Force System Alerts ON                  [ON] ●    │   │
│ │ Allow User Overrides                       [ON] ●    │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ Quiet Hours                                                 │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Enable Quiet Hours                         [ON] ●    │   │
│ │ Start: [22:00]  End: [07:00]                        │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│                                      [Save System Settings] │
└─────────────────────────────────────────────────────────────┘
```

### User View (With Forced Settings)
```
┌─────────────────────────────────────────────────────────────┐
│ 🔔 My Notification Preferences                              │
│ Customize your personal notification settings               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ System Alerts [Required by Admin]              [ON] ●      │
│ Critical system notifications (Cannot be disabled)          │
│                                                              │
│ Order Updates                                   [ON] ●      │
│ Get notified about order changes                            │
│                                                              │
│ Appointment Reminders                           [OFF]       │
│ Reminders for upcoming appointments                         │
│                                                              │
│ Email Notifications                             [OFF]       │
│ Receive notifications via email                             │
│                                                              │
│                        [Restore Defaults] [Save Preferences]│
└─────────────────────────────────────────────────────────────┘
```

### User View (Customization Disabled)
```
┌─────────────────────────────────────────────────────────────┐
│ 🔔 My Notification Preferences                              │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Customization Disabled                                   │
│ Your administrator has disabled notification customization. │
│ System defaults will be used.                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ System Alerts [Using System Default]           [ON] ●      │
│ Critical system notifications (Disabled)                    │
│                                                              │
│ Order Updates [Using System Default]            [ON] ●      │
│ Get notified about order changes (Disabled)                 │
│                                                              │
│ Appointment Reminders [Using System Default]   [OFF]       │
│ Reminders for upcoming appointments (Disabled)              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

This implementation maintains full backward compatibility while adding:
1. ✅ Admin UI for system-wide notification defaults
2. ✅ Visual indicators for forced/default settings
3. ✅ Merge logic respects system overrides
4. ✅ User experience clearly shows what they can/cannot control
5. ✅ All changes are non-breaking
