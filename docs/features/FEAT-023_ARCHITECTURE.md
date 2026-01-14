# FEAT-023: System vs User Notification Preferences - Architecture

Visual diagrams and data flow for the two-tier notification preference system.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────┐          ┌───────────────────────┐      │
│  │   Admin Dashboard     │          │   User Settings       │      │
│  │                       │          │                       │      │
│  │ System Notification   │          │ My Notification       │      │
│  │ Settings              │          │ Preferences           │      │
│  │                       │          │                       │      │
│  │ • Global toggles      │          │ • Personal toggles    │      │
│  │ • Force settings      │          │ • View defaults       │      │
│  │ • Quiet hours         │          │ • Override system     │      │
│  │ • User override       │          │                       │      │
│  │   permissions         │          │                       │      │
│  └───────────┬───────────┘          └───────────┬───────────┘      │
│              │                                   │                  │
│              │ updateSystemSettings              │ updatePreferences│
│              │ getSystemSettings                 │ getEffective-    │
│              │                                   │   Preferences    │
└──────────────┼───────────────────────────────────┼──────────────────┘
               │                                   │
               ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER (tRPC)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  notificationsRouter:                                                │
│                                                                       │
│  ┌─────────────────────┐          ┌─────────────────────┐          │
│  │ ADMIN PROCEDURES    │          │ USER PROCEDURES     │          │
│  ├─────────────────────┤          ├─────────────────────┤          │
│  │ getSystemSettings   │          │ getPreferences      │          │
│  │ updateSystemSettings│          │ updatePreferences   │          │
│  └──────────┬──────────┘          │ getEffective-       │          │
│             │                     │   Preferences       │          │
│             │                     │ getNotification-    │          │
│             │                     │   Categories        │          │
│             │                     └──────────┬──────────┘          │
│             │                                │                      │
└─────────────┼────────────────────────────────┼──────────────────────┘
              │                                │
              │                                │
              ▼                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  notificationService.ts:                                             │
│  • queueNotification()                                               │
│  • processNotificationQueue()                                        │
│  • filterChannelsByPreferences()                                     │
│  • isCategoryEnabled()                                               │
│                                                                       │
│  notificationRepository.ts:                                          │
│  • getPreferences()                                                  │
│  • savePreferences()                                                 │
│  • insertNotification()                                              │
│                                                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────┐    ┌─────────────────────┐               │
│  │ organization_        │    │ notification_       │               │
│  │ settings             │    │ preferences         │               │
│  ├──────────────────────┤    ├─────────────────────┤               │
│  │ SYSTEM DEFAULTS      │    │ USER OVERRIDES      │               │
│  ├──────────────────────┤    ├─────────────────────┤               │
│  │ • email_enabled      │    │ • userId            │               │
│  │ • in_app_enabled     │    │ • clientId          │               │
│  │ • sms_enabled        │    │ • inAppEnabled      │               │
│  │ • system_alerts_     │    │ • emailEnabled      │               │
│  │   forced             │    │ • appointment-      │               │
│  │ • order_updates_     │    │   Reminders         │               │
│  │   default            │    │ • orderUpdates      │               │
│  │ • appointment_       │    │ • systemAlerts      │               │
│  │   reminders_default  │    │                     │               │
│  │ • quiet_hours_*      │    │                     │               │
│  │ • allow_user_        │    │                     │               │
│  │   overrides          │    │                     │               │
│  └──────────────────────┘    └─────────────────────┘               │
│           │                              │                          │
│           └──────────────┬───────────────┘                          │
│                          │                                          │
│                          ▼                                          │
│            ┌──────────────────────────┐                            │
│            │ MERGE LOGIC              │                            │
│            │ (in getEffectivePrefs)   │                            │
│            └──────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Preference Resolution Flow

### Detailed Merge Logic

```
┌────────────────────────────────────────────────────────────────────┐
│ INPUT: User requests their effective notification preferences     │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ STEP 1: Fetch User Preferences                                    │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ SELECT * FROM notification_preferences                     │   │
│ │ WHERE userId = ? AND isDeleted = false                     │   │
│ │                                                             │   │
│ │ If not found → Create with defaults:                       │   │
│ │   inAppEnabled: true                                       │   │
│ │   emailEnabled: true                                       │   │
│ │   appointmentReminders: true                               │   │
│ │   orderUpdates: true                                       │   │
│ │   systemAlerts: true                                       │   │
│ └────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ STEP 2: Fetch System Settings                                     │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ SELECT * FROM organization_settings                        │   │
│ │ WHERE settingKey LIKE 'notification_%'                     │   │
│ │   AND isActive = true                                      │   │
│ │                                                             │   │
│ │ Parse JSON values for:                                     │   │
│ │   - notification_email_enabled                             │   │
│ │   - notification_in_app_enabled                            │   │
│ │   - notification_sms_enabled                               │   │
│ │   - notification_system_alerts_forced                      │   │
│ │   - notification_allow_user_overrides                      │   │
│ │   - notification_quiet_hours_*                             │   │
│ └────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ STEP 3: Apply Merge Logic                                         │
│                                                                     │
│  FOR EACH preference type:                                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ CHANNEL-LEVEL (inApp, email, sms)                        │    │
│  │                                                            │    │
│  │ IF system.[channel]Enabled == false                       │    │
│  │   THEN effective.[channel]Enabled = false                 │    │
│  │   (System disabled globally - override user)              │    │
│  │                                                            │    │
│  │ ELSE IF system.allowUserOverrides == false                │    │
│  │   THEN effective.[channel]Enabled = true                  │    │
│  │   (Use system default)                                    │    │
│  │                                                            │    │
│  │ ELSE                                                       │    │
│  │   effective.[channel]Enabled = user.[channel]Enabled      │    │
│  │   (Respect user preference)                               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ CATEGORY-LEVEL (appointments, orders, systemAlerts)      │    │
│  │                                                            │    │
│  │ IF category == systemAlerts AND                           │    │
│  │    system.systemAlertsForced == true                      │    │
│  │   THEN effective.systemAlerts = true                      │    │
│  │   (Force ON - admin requirement)                          │    │
│  │                                                            │    │
│  │ ELSE IF system.allowUserOverrides == false                │    │
│  │   THEN effective.[category] = system.[category]Default    │    │
│  │   (Use system default)                                    │    │
│  │                                                            │    │
│  │ ELSE                                                       │    │
│  │   effective.[category] = user.[category]                  │    │
│  │   (Respect user preference)                               │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ OUTPUT: Effective Preferences Object                              │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ {                                                           │   │
│ │   userPreferences: { /* raw user settings */ },            │   │
│ │   systemSettings: {                                        │   │
│ │     emailNotificationsEnabled: true,                       │   │
│ │     inAppNotificationsEnabled: true,                       │   │
│ │     systemAlertsForced: true,                              │   │
│ │     allowUserOverrides: true,                              │   │
│ │     quietHoursEnabled: false,                              │   │
│ │     quietHoursStart: "22:00",                              │   │
│ │     quietHoursEnd: "07:00"                                 │   │
│ │   },                                                        │   │
│ │   effectivePreferences: {                                  │   │
│ │     inAppEnabled: true,      // ✓ User pref respected     │   │
│ │     emailEnabled: false,     // ✓ User pref respected     │   │
│ │     appointmentReminders: true, // ✓ User pref respected  │   │
│ │     orderUpdates: true,      // ✓ User pref respected     │   │
│ │     systemAlerts: true       // ⚠️ FORCED by admin        │   │
│ │   },                                                        │   │
│ │   canCustomize: true                                       │   │
│ │ }                                                           │   │
│ └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Notification Delivery Flow (With Preferences)

```
┌────────────────────────────────────────────────────────────────────┐
│ EVENT: Order status changed to "Shipped"                          │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Application Code:                                                  │
│ await queueNotification({                                          │
│   userId: 42,                                                      │
│   type: "info",                                                    │
│   title: "Order Shipped",                                          │
│   message: "Your order #1234 has shipped",                         │
│   category: "order",                                               │
│   channels: ["in_app", "email"],                                   │
│ });                                                                 │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ QUEUE: Add to in-memory notification queue                        │
│ Then auto-process via setImmediate()                              │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ PROCESS QUEUE:                                                     │
│                                                                     │
│ 1. Get user preferences (userId: 42)                               │
│    ┌──────────────────────────────────────────────────┐           │
│    │ UserPrefs = {                                     │           │
│    │   inAppEnabled: true,                             │           │
│    │   emailEnabled: false,  ← User disabled email    │           │
│    │   orderUpdates: true                              │           │
│    │ }                                                 │           │
│    └──────────────────────────────────────────────────┘           │
│                                                                     │
│ 2. Check if category enabled                                       │
│    isCategoryEnabled(UserPrefs, "order")                           │
│    → UserPrefs.orderUpdates = true ✓                               │
│                                                                     │
│ 3. Filter channels by preferences                                  │
│    Requested: ["in_app", "email"]                                  │
│                                                                     │
│    Check in_app:                                                   │
│      UserPrefs.inAppEnabled = true ✓                               │
│      → Include "in_app"                                            │
│                                                                     │
│    Check email:                                                    │
│      UserPrefs.emailEnabled = false ✗                              │
│      → Exclude "email"                                             │
│                                                                     │
│    Enabled channels: ["in_app"]                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ CREATE NOTIFICATIONS:                                              │
│                                                                     │
│ FOR EACH enabled channel:                                          │
│                                                                     │
│   INSERT INTO notifications (                                      │
│     userId, type, title, message, channel, read, metadata          │
│   ) VALUES (                                                        │
│     42, "info", "Order Shipped", "...", "in_app", false, {...}     │
│   );                                                                │
│                                                                     │
│ ✓ Created 1 notification (in_app only)                             │
│ ✗ Skipped email (user disabled)                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ DELIVERY:                                                          │
│                                                                     │
│ in_app:                                                            │
│   • Record inserted in DB                                          │
│   • User's next poll will fetch it                                 │
│   • Appears in notification bell                                   │
│                                                                     │
│ email:                                                             │
│   • Not sent (user preference)                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Permission Levels Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PERMISSION LEVELS FOR NOTIFICATION SETTINGS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┬────────────────────────┬─────────────────────┐   │
│  │ Action           │ Regular User           │ Admin               │   │
│  ├──────────────────┼────────────────────────┼─────────────────────┤   │
│  │ View own         │ ✓ YES                  │ ✓ YES               │   │
│  │ preferences      │ getPreferences()       │ getPreferences()    │   │
│  │                  │                        │                     │   │
│  ├──────────────────┼────────────────────────┼─────────────────────┤   │
│  │ Update own       │ ✓ YES (if allowed)     │ ✓ YES               │   │
│  │ preferences      │ updatePreferences()    │ updatePreferences() │   │
│  │                  │ IF allowUserOverrides  │ (no restrictions)   │   │
│  │                  │                        │                     │   │
│  ├──────────────────┼────────────────────────┼─────────────────────┤   │
│  │ View system      │ ✗ NO                   │ ✓ YES               │   │
│  │ settings         │ (403 Forbidden)        │ getSystemSettings() │   │
│  │                  │                        │                     │   │
│  ├──────────────────┼────────────────────────┼─────────────────────┤   │
│  │ Update system    │ ✗ NO                   │ ✓ YES               │   │
│  │ settings         │ (403 Forbidden)        │ updateSystem-       │   │
│  │                  │                        │   Settings()        │   │
│  │                  │                        │                     │   │
│  ├──────────────────┼────────────────────────┼─────────────────────┤   │
│  │ View effective   │ ✓ YES                  │ ✓ YES               │   │
│  │ preferences      │ getEffective-          │ getEffective-       │   │
│  │ (merged)         │   Preferences()        │   Preferences()     │   │
│  │                  │                        │                     │   │
│  ├──────────────────┼────────────────────────┼─────────────────────┤   │
│  │ View other       │ ✗ NO                   │ ✗ NO                │   │
│  │ users' prefs     │ (403 Forbidden)        │ (not implemented)   │   │
│  │                  │                        │                     │   │
│  └──────────────────┴────────────────────────┴─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Decision Tree: Which Preference Wins?

```
                        User opens Notification Settings
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Fetch System Settings         │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ allowUserOverrides == false?  │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                   YES                             NO
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐     ┌───────────────────────┐
        │ Use System Defaults   │     │ Check specific        │
        │ for ALL preferences   │     │ preference type       │
        │                       │     └───────────┬───────────┘
        │ User cannot customize │                 │
        └───────────────────────┘                 │
                                                  ▼
                        ┌─────────────────────────────────────┐
                        │ What preference are we checking?    │
                        └─────────────────┬───────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
        ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
        │ CHANNEL           │ │ SYSTEM ALERTS     │ │ OTHER CATEGORIES  │
        │ (email/inApp/sms) │ │                   │ │ (order/appt)      │
        └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
                  │                     │                     │
                  ▼                     ▼                     ▼
        ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
        │ System disabled   │ │ systemAlertsForced│ │ User preference   │
        │ this channel?     │ │ == true?          │ │ respected         │
        └─────────┬─────────┘ └─────────┬─────────┘ └───────────────────┘
                  │                     │
        ┌─────────┴─────────┐ ┌─────────┴─────────┐
       YES                 NO YES                 NO
        │                   │  │                   │
        ▼                   ▼  ▼                   ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Force OFF     │ │ User pref     │ │ Force ON      │ │ User pref     │
│ (system       │ │ respected     │ │ (admin req)   │ │ respected     │
│  override)    │ │               │ │               │ │               │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘

LEGEND:
  • Force OFF: effective = false, toggle disabled
  • Force ON: effective = true, toggle disabled
  • User pref: effective = user setting, toggle enabled
```

---

## State Diagram: Notification Preference States

```
┌─────────────────────────────────────────────────────────────────────┐
│ NOTIFICATION PREFERENCE STATES                                      │
└─────────────────────────────────────────────────────────────────────┘

State 1: DEFAULT (New User)
  ┌────────────────────────────────────────┐
  │ No record in notification_preferences  │
  │                                        │
  │ Effective = System Defaults            │
  │   • All channels: ON                   │
  │   • All categories: ON                 │
  │                                        │
  │ UI: All toggles enabled                │
  │ Badge: None                            │
  └────────────────────────────────────────┘
                    │
                    │ User changes preference
                    ▼
State 2: CUSTOMIZED (User Override)
  ┌────────────────────────────────────────┐
  │ Record created with user choices       │
  │                                        │
  │ Effective = User Preferences           │
  │   (unless system overrides)            │
  │                                        │
  │ UI: Toggles reflect user choices       │
  │ Badge: None (or "System Override")     │
  └────────────────────────────────────────┘
                    │
                    │ Admin disables allowUserOverrides
                    ▼
State 3: LOCKED (System Override)
  ┌────────────────────────────────────────┐
  │ User record exists but ignored         │
  │                                        │
  │ Effective = System Defaults            │
  │   (user settings preserved)            │
  │                                        │
  │ UI: All toggles disabled               │
  │ Badge: "Using System Default"          │
  │ Alert: "Customization Disabled"        │
  └────────────────────────────────────────┘
                    │
                    │ Admin re-enables allowUserOverrides
                    ▼
State 2: CUSTOMIZED (Restored)
  ┌────────────────────────────────────────┐
  │ User record restored                   │
  │                                        │
  │ Effective = User Preferences           │
  │   (user's old settings restored)       │
  │                                        │
  │ UI: Toggles enabled again              │
  │ Badge: None                            │
  └────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │ SPECIAL CASE:        │
                    │ Force System Alerts  │
                    └──────────────────────┘
                              │
                              ▼
State 4: PARTIALLY LOCKED
  ┌────────────────────────────────────────┐
  │ Most prefs user-controlled             │
  │                                        │
  │ Effective:                             │
  │   • systemAlerts: true (FORCED)        │
  │   • others: User preferences           │
  │                                        │
  │ UI:                                    │
  │   • System Alerts: disabled, ON        │
  │   • Others: enabled                    │
  │ Badge: "Required by Admin"             │
  │   (on System Alerts only)              │
  └────────────────────────────────────────┘
```

---

## Database Schema Relationships

```
┌──────────────────────────────────────────────────────────────────────┐
│                     DATABASE SCHEMA                                  │
└──────────────────────────────────────────────────────────────────────┘

organization_settings                    notification_preferences
┌──────────────────────┐                ┌────────────────────────┐
│ id (PK)              │                │ id (PK)                │
│ settingKey           │                │ recipientType          │
│ settingValue (JSON)  │                │ userId (FK → users)    │
│ settingType          │                │ clientId (FK → clients)│
│ description          │                │ inAppEnabled           │
│ scope                │                │ emailEnabled           │
│ isActive             │                │ appointmentReminders   │
│ createdAt            │                │ orderUpdates           │
│ updatedAt            │                │ systemAlerts           │
└──────────────────────┘                │ isDeleted              │
         │                              │ createdAt              │
         │ Merge Logic                  │ updatedAt              │
         │ (in backend)                 └────────────────────────┘
         │                                        │
         │                                        │
         └────────────┬───────────────────────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │ Effective            │
            │ Preferences          │
            │ (computed)           │
            └──────────────────────┘
                      │
                      │ Used by
                      ▼
              notifications
            ┌──────────────────────┐
            │ id (PK)              │
            │ recipientType        │
            │ userId (FK)          │
            │ clientId (FK)        │
            │ type                 │
            │ title                │
            │ message              │
            │ link                 │
            │ channel              │◄─── Filtered by prefs
            │ read                 │
            │ metadata             │
            │ isDeleted            │
            │ createdAt            │
            │ updatedAt            │
            └──────────────────────┘


RELATIONSHIPS:
  • organization_settings (1) : (0..1) system notification config
  • notification_preferences (1:1) with users OR clients
  • notifications (N:1) with users OR clients
  • Merge happens in application layer (not DB)
```

---

## Deployment Considerations

### Migration Strategy
```
┌────────────────────────────────────────────────────────────────────┐
│ DEPLOYMENT PHASES                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Phase 1: Backend Already Deployed ✓                                │
│   • notification_preferences table exists                          │
│   • organizationSettings table exists                              │
│   • Merge logic implemented in router                              │
│   • No database changes needed                                     │
│                                                                     │
│ Phase 2: Seed Default System Settings                              │
│   • Run migration to insert default values:                        │
│     INSERT INTO organization_settings VALUES                       │
│       ('notification_email_enabled', 'true', ...),                 │
│       ('notification_in_app_enabled', 'true', ...),                │
│       ('notification_allow_user_overrides', 'true', ...);          │
│                                                                     │
│ Phase 3: Deploy Admin UI                                           │
│   • Add SystemNotificationSettings component                       │
│   • Update Settings page to include admin section                  │
│   • Test admin controls                                            │
│   • Existing user preferences NOT affected                         │
│                                                                     │
│ Phase 4: Deploy Enhanced User UI                                   │
│   • Update NotificationPreferences to use getEffectivePreferences  │
│   • Add badges for forced/default settings                         │
│   • Existing functionality preserved (backward compatible)         │
│   • Users see new indicators immediately                           │
│                                                                     │
│ Phase 5: Admin Communication                                       │
│   • Notify admins of new system settings                           │
│   • Provide documentation                                          │
│   • Optional: Set initial forced settings per org requirements     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

ZERO DOWNTIME ✓
  • All changes are additive
  • Existing user preferences preserved
  • Default behavior unchanged (allow overrides = true)
  • Admin features are opt-in
```

---

## Summary

This architecture provides:

1. **Separation of Concerns**
   - System defaults in `organization_settings`
   - User overrides in `notification_preferences`
   - Clean merge logic in API layer

2. **Flexible Control**
   - Admins can force settings or set defaults
   - Users can customize (unless blocked)
   - Clear visual feedback in UI

3. **Backward Compatibility**
   - Existing user preferences preserved
   - Default behavior: allow all customization
   - No breaking changes

4. **Extensibility**
   - Easy to add new notification categories
   - Can extend to per-channel per-category
   - Quiet hours framework ready for implementation
