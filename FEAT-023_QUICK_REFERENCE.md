# FEAT-023: Quick Reference

**Two-Tier Notification Preferences: System vs User Level**

---

## Current Status

| Component | Status | Location |
|-----------|--------|----------|
| **Backend API** | ✅ Complete | `/home/user/TERP/server/routers/notifications.ts` |
| **Database Schema** | ✅ Complete | `/home/user/TERP/drizzle/schema.ts` |
| **Merge Logic** | ✅ Complete | `getEffectivePreferences` endpoint |
| **User Preferences UI** | ⚠️ Partial | `/home/user/TERP/client/src/pages/settings/NotificationPreferences.tsx` |
| **Admin Settings UI** | ❌ Missing | Needs to be created |

**Completion:** 75% (Backend 100%, Frontend 50%)

---

## Key Files

### Backend (✅ Complete)
- **Schema:** `/home/user/TERP/drizzle/schema.ts` (lines 4631-4716)
- **Router:** `/home/user/TERP/server/routers/notifications.ts` (lines 1-386)
- **Service:** `/home/user/TERP/server/services/notificationService.ts`
- **Repository:** `/home/user/TERP/server/services/notificationRepository.ts`

### Frontend (⚠️ Needs Work)
- **User Prefs:** `/home/user/TERP/client/src/pages/settings/NotificationPreferences.tsx`
- **Settings Page:** `/home/user/TERP/client/src/pages/Settings.tsx` (lines 138-156)
- **Admin UI:** ❌ Needs to be created at `/client/src/pages/settings/SystemNotificationSettings.tsx`

---

## API Endpoints

### Admin Endpoints (adminProcedure)
```typescript
// Get system-level settings
trpc.notifications.getSystemSettings.useQuery()

// Update system-level settings
trpc.notifications.updateSystemSettings.useMutation({
  emailNotificationsEnabled: boolean,
  systemAlertsForced: boolean,
  allowUserOverrides: boolean,
  quietHoursEnabled: boolean,
  quietHoursStart: string, // "22:00"
  quietHoursEnd: string,   // "07:00"
  // ... more settings
})
```

### User Endpoints (protectedProcedure)
```typescript
// Get raw user preferences
trpc.notifications.getPreferences.useQuery()

// Update user preferences
trpc.notifications.updatePreferences.useMutation({
  inAppEnabled: boolean,
  emailEnabled: boolean,
  appointmentReminders: boolean,
  orderUpdates: boolean,
  systemAlerts: boolean,
})

// Get merged preferences (system + user)
trpc.notifications.getEffectivePreferences.useQuery()
// Returns:
// {
//   userPreferences: {...},
//   systemSettings: {...},
//   effectivePreferences: {...},  // <- What actually applies
//   canCustomize: boolean
// }
```

---

## Merge Logic Summary

```typescript
// Pseudo-code for how preferences are resolved

if (system.allowUserOverrides === false) {
  // User cannot customize - use system defaults
  effective = systemDefaults;
}
else if (system.systemAlertsForced && category === 'systemAlerts') {
  // Admin forced system alerts ON
  effective.systemAlerts = true;
}
else if (system.emailNotificationsEnabled === false) {
  // System disabled email globally
  effective.emailEnabled = false;
}
else {
  // Respect user preference
  effective = userPreference;
}
```

---

## What Needs to Be Built

### 1. Admin System Settings UI (Priority 1)
**File:** Create `/home/user/TERP/client/src/pages/settings/SystemNotificationSettings.tsx`

**Features:**
- Global channel toggles (email, in-app, SMS)
- Default notification categories for new users
- Force system alerts ON checkbox
- Allow user overrides toggle
- Quiet hours configuration

**Integration:** Add to `/home/user/TERP/client/src/pages/Settings.tsx` notifications tab

---

### 2. Enhanced User Preferences UI (Priority 2)
**File:** Update `/home/user/TERP/client/src/pages/settings/NotificationPreferences.tsx`

**Changes Needed:**
1. Switch from `getPreferences` to `getEffectivePreferences`
2. Add badges:
   - "Required by Admin" (forced settings)
   - "Using System Default" (when customization disabled)
   - "System Override" (when system overrides user choice)
3. Disable toggles for forced settings
4. Show system info (quiet hours, etc.)

---

## System Settings Stored In

**Table:** `organization_settings`

**Keys:**
- `notification_email_enabled` (boolean)
- `notification_in_app_enabled` (boolean)
- `notification_sms_enabled` (boolean)
- `notification_system_alerts_forced` (boolean)
- `notification_order_updates_default` (boolean)
- `notification_appointment_reminders_default` (boolean)
- `notification_quiet_hours_enabled` (boolean)
- `notification_quiet_hours_start` (string)
- `notification_quiet_hours_end` (string)
- `notification_allow_user_overrides` (boolean)

---

## User Preferences Stored In

**Table:** `notification_preferences`

**Fields:**
- `recipientType` ("user" | "client")
- `userId` (FK to users)
- `clientId` (FK to clients)
- `inAppEnabled` (boolean, default: true)
- `emailEnabled` (boolean, default: true)
- `appointmentReminders` (boolean, default: true)
- `orderUpdates` (boolean, default: true)
- `systemAlerts` (boolean, default: true)

---

## Default Behavior

**Without Admin Changes:**
- ✅ All channels enabled (email, in-app, SMS)
- ✅ Users can customize all preferences
- ✅ All notification categories enabled by default
- ✅ No forced settings
- ✅ No quiet hours

**This is backward compatible** - existing installations work as before.

---

## Example Scenarios

### Scenario 1: Force System Alerts
```typescript
// Admin sets:
await updateSystemSettings({ systemAlertsForced: true });

// Result:
// - All users MUST receive system alerts
// - System Alerts toggle disabled for users
// - Badge shows "Required by Admin"
```

### Scenario 2: Disable User Customization
```typescript
// Admin sets:
await updateSystemSettings({ allowUserOverrides: false });

// Result:
// - All toggles disabled for users
// - All users use system defaults
// - Alert shows "Customization Disabled"
// - User preferences preserved (not deleted)
```

### Scenario 3: Set Quiet Hours
```typescript
// Admin sets:
await updateSystemSettings({
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00"
});

// Result:
// - No email/SMS sent between 22:00-07:00
// - In-app notifications still work
// - Users see quiet hours info in UI
```

---

## Testing Checklist

### Backend (✅ Already Works)
- [x] Get system settings
- [x] Update system settings
- [x] Get effective preferences
- [x] Merge logic respects forced settings
- [x] Merge logic respects allowUserOverrides
- [x] Notification service filters by preferences

### Frontend (⚠️ TODO)
- [ ] Admin can view system settings
- [ ] Admin can update system settings
- [ ] System settings persist correctly
- [ ] Users see badges for forced settings
- [ ] Users see badges for system defaults
- [ ] Toggles disabled when appropriate
- [ ] System info displayed (quiet hours)
- [ ] Existing preferences still work

---

## Deployment Steps

1. **Seed System Defaults** (optional, has safe defaults)
   ```sql
   INSERT INTO organization_settings (settingKey, settingValue, settingType)
   VALUES
     ('notification_email_enabled', 'true', 'BOOLEAN'),
     ('notification_allow_user_overrides', 'true', 'BOOLEAN');
   ```

2. **Deploy Admin UI**
   - Create `SystemNotificationSettings.tsx`
   - Update `Settings.tsx` to include it
   - Test with admin account

3. **Deploy Enhanced User UI**
   - Update `NotificationPreferences.tsx`
   - Add badge components
   - Test with regular account

4. **Verify**
   - Test forced settings
   - Test system overrides
   - Test quiet hours display

---

## Documentation

**Full Documentation:**
- `/home/user/TERP/docs/features/FEAT-023_NOTIFICATION_PREFERENCES_SUMMARY.md`
- `/home/user/TERP/docs/features/FEAT-023_IMPLEMENTATION_EXAMPLES.md`
- `/home/user/TERP/docs/features/FEAT-023_ARCHITECTURE.md`

**Backend Spec:**
- `/home/user/TERP/docs/specs/core-systems/NOTIF-001-SPEC.md`

---

## Time Estimate

**Remaining Work:** 4-6 hours
- Admin UI: 2 hours
- Enhanced User UI: 2 hours
- Testing & Polish: 1-2 hours

---

## Questions?

**How do I test the merge logic?**
Use the `getEffectivePreferences` endpoint and check the returned object.

**Can users see system settings?**
No, only admins can view/edit system settings. Users only see their effective preferences.

**Are existing user preferences deleted?**
No, they're preserved even when `allowUserOverrides = false`.

**What if I want per-category per-channel control?**
Not currently supported. Would require schema changes. See "Future Enhancements" in summary doc.

**Is this backward compatible?**
Yes! Default behavior allows all customization, just like before.
