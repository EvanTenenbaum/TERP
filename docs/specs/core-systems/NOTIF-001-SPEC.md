# NOTIF-001: Unified Notification System Architecture

**Priority:** HIGH
**Estimate:** 32 hours
**Status:** Not Started
**Blocking:** VIP-C-001 (Appointment Scheduling)

---

## 1. Overview

This specification defines a unified notification system that serves both the ERP application and the VIP Portal. The current "Inbox" system will be renamed to "Notifications" and expanded to support multiple recipient types, notification channels, and configurable rules.

### Current State

| Component | Status | Issues |
|-----------|--------|--------|
| `inboxItems` table | Exists | Limited `sourceType` enum, ERP users only |
| `inbox` router | Exists | Functional but limited |
| `InboxPanel` UI | Exists | Needs rename to "Notifications" |
| `notificationService.ts` | Stub | Logs only, doesn't create records |
| VIP Portal notifications | **Missing** | No infrastructure |

### Target State

A unified notification system where:
- Both ERP users and VIP Portal clients receive notifications
- Notifications are delivered in-app with optional future expansion to email/SMS
- Notification rules and types are configurable
- Real-time or near-real-time delivery via polling (WebSocket optional future enhancement)

---

## 2. Database Schema

### 2.1 Rename and Expand `inboxItems` → `notifications`

```sql
-- Rename table
RENAME TABLE inbox_items TO notifications;

-- Add new columns
ALTER TABLE notifications
  ADD COLUMN recipient_type ENUM('user', 'client') NOT NULL DEFAULT 'user' AFTER id,
  ADD COLUMN notification_type VARCHAR(100) NOT NULL AFTER source_type,
  ADD COLUMN channel ENUM('in_app', 'email', 'sms', 'push') NOT NULL DEFAULT 'in_app' AFTER notification_type,
  ADD COLUMN delivered_at TIMESTAMP NULL AFTER completed_at,
  ADD COLUMN metadata JSON AFTER description;

-- Update sourceType enum to include more types
ALTER TABLE notifications 
  MODIFY COLUMN source_type ENUM(
    'mention',
    'task_assignment', 
    'task_update',
    'appointment_request',
    'appointment_confirmed',
    'appointment_rejected',
    'appointment_rescheduled',
    'invoice_created',
    'payment_received',
    'interest_list_processed',
    'system_alert',
    'general'
  ) NOT NULL;

-- Add index for recipient_type
CREATE INDEX idx_recipient_type ON notifications(recipient_type);
```

### 2.2 New Table: `notification_types`

Defines the available notification types and their default settings.

```sql
CREATE TABLE notification_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'appointment_confirmed'
  name VARCHAR(255) NOT NULL, -- e.g., 'Appointment Confirmed'
  description TEXT,
  category ENUM('appointments', 'orders', 'invoices', 'tasks', 'system') NOT NULL,
  default_channel ENUM('in_app', 'email', 'sms', 'push') DEFAULT 'in_app',
  template_title VARCHAR(500), -- Template with {{placeholders}}
  template_body TEXT, -- Template with {{placeholders}}
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2.3 New Table: `notification_preferences`

Allows users/clients to customize their notification preferences.

```sql
CREATE TABLE notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_type ENUM('user', 'client') NOT NULL,
  recipient_id INT NOT NULL, -- user_id or client_id
  notification_type_id INT NOT NULL REFERENCES notification_types(id),
  channel ENUM('in_app', 'email', 'sms', 'push') NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_pref (recipient_type, recipient_id, notification_type_id, channel)
);
```

---

## 3. Backend Architecture

### 3.1 Notification Service (Refactored)

Replace the stub `notificationService.ts` with a full implementation:

```typescript
// server/services/notificationService.ts

interface SendNotificationParams {
  type: string; // notification_type.code
  recipientType: 'user' | 'client';
  recipientId: number;
  referenceType?: string;
  referenceId?: number;
  data?: Record<string, unknown>; // For template interpolation
}

export async function sendNotification(params: SendNotificationParams): Promise<void> {
  // 1. Look up notification type
  const notificationType = await getNotificationType(params.type);
  
  // 2. Check recipient preferences
  const preferences = await getRecipientPreferences(
    params.recipientType, 
    params.recipientId, 
    notificationType.id
  );
  
  // 3. Render templates
  const title = renderTemplate(notificationType.templateTitle, params.data);
  const body = renderTemplate(notificationType.templateBody, params.data);
  
  // 4. Create notification record(s) for each enabled channel
  for (const pref of preferences.filter(p => p.isEnabled)) {
    await createNotification({
      recipientType: params.recipientType,
      userId: params.recipientType === 'user' ? params.recipientId : null,
      clientId: params.recipientType === 'client' ? params.recipientId : null,
      sourceType: params.type,
      notificationType: params.type,
      channel: pref.channel,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      title,
      description: body,
      metadata: params.data,
    });
    
    // 5. Deliver via channel (in_app is automatic, others need integration)
    if (pref.channel !== 'in_app') {
      await queueChannelDelivery(pref.channel, { title, body, recipientId: params.recipientId });
    }
  }
}

export async function sendBulkNotification(
  recipientIds: number[],
  recipientType: 'user' | 'client',
  params: Omit<SendNotificationParams, 'recipientType' | 'recipientId'>
): Promise<void> {
  await Promise.all(
    recipientIds.map(id => sendNotification({ ...params, recipientType, recipientId: id }))
  );
}
```

### 3.2 Notification Router (Refactored)

Rename `inbox` router to `notifications` and expand:

```typescript
// server/routers/notifications.ts

export const notificationsRouter = router({
  // For ERP users
  getMyNotifications: protectedProcedure.query(...),
  getUnread: protectedProcedure.query(...),
  markAsRead: protectedProcedure.mutation(...),
  markAllAsRead: protectedProcedure.mutation(...),
  
  // Preferences
  getMyPreferences: protectedProcedure.query(...),
  updatePreference: protectedProcedure.mutation(...),
  
  // Admin: Notification Types
  getNotificationTypes: protectedProcedure.query(...),
  updateNotificationType: protectedProcedure.mutation(...),
});
```

### 3.3 VIP Portal Notification Endpoints

Add to `vipPortal.ts`:

```typescript
notifications: {
  getAll: vipPortalProcedure.query(...),
  getUnread: vipPortalProcedure.query(...),
  markAsRead: vipPortalProcedure.mutation(...),
  markAllAsRead: vipPortalProcedure.mutation(...),
  getPreferences: vipPortalProcedure.query(...),
  updatePreference: vipPortalProcedure.mutation(...),
}
```

---

## 4. Frontend Architecture

### 4.1 ERP: Rename Inbox to Notifications

1. Rename `InboxPanel` → `NotificationPanel`
2. Rename `InboxItem` → `NotificationItem`
3. Rename `/inbox` route → `/notifications`
4. Update all references in navigation and components
5. Add 30-second polling for near-real-time updates

### 4.2 VIP Portal: Add Notification Bell

1. Create `VIPNotificationBell` component
2. Add to VIP Portal header
3. Show unread count badge
4. Dropdown panel with recent notifications
5. Click to navigate to relevant page
6. Add 30-second polling

### 4.3 Notification Preferences UI

Both ERP and VIP Portal should have a preferences page where users can:
- See all notification types
- Enable/disable each type
- (Future) Choose channel per type

---

## 5. Initial Notification Types

Seed the `notification_types` table with:

| Code | Name | Category | Template Title |
|------|------|----------|----------------|
| `task_assigned` | Task Assigned | tasks | You have been assigned a new task |
| `task_updated` | Task Updated | tasks | A task you're watching was updated |
| `mention` | Mentioned | tasks | You were mentioned in a comment |
| `appointment_request` | Appointment Request | appointments | New appointment request from {{clientName}} |
| `appointment_confirmed` | Appointment Confirmed | appointments | Your appointment has been confirmed |
| `appointment_rejected` | Appointment Rejected | appointments | Your appointment request was declined |
| `appointment_rescheduled` | Appointment Rescheduled | appointments | A new time has been proposed for your appointment |
| `invoice_created` | Invoice Created | invoices | A new invoice has been created |
| `payment_received` | Payment Received | invoices | Payment received for invoice #{{invoiceNumber}} |
| `interest_list_processed` | Interest List Processed | orders | Your interest list has been processed |
| `system_alert` | System Alert | system | {{message}} |

---

## 6. Migration Plan

1. **Phase 1:** Create new tables (`notification_types`, `notification_preferences`)
2. **Phase 2:** Add new columns to `inbox_items`
3. **Phase 3:** Migrate existing data (set `recipient_type='user'`, `channel='in_app'`)
4. **Phase 4:** Rename table `inbox_items` → `notifications`
5. **Phase 5:** Update all backend code to use new schema
6. **Phase 6:** Update all frontend code (rename components, routes)
7. **Phase 7:** Seed initial notification types
8. **Phase 8:** Add VIP Portal notification UI

---

## 7. Acceptance Criteria

1. The "Inbox" is renamed to "Notifications" throughout the application
2. Both ERP users and VIP Portal clients can receive notifications
3. Notifications are stored in a unified `notifications` table
4. Notification types are configurable via `notification_types` table
5. Users/clients can manage their notification preferences
6. The notification service creates actual records (not just logs)
7. Notifications appear within 30 seconds via polling

---

## 8. Estimate Breakdown

| Component | Estimate |
|-----------|----------|
| Database schema changes & migration | 4h |
| Notification service refactor | 8h |
| Notifications router refactor | 4h |
| VIP Portal notification endpoints | 4h |
| ERP UI rename (Inbox → Notifications) | 4h |
| VIP Portal notification bell UI | 4h |
| Notification preferences UI (both) | 4h |
| **Total** | **32h** |

---

## 9. Future Enhancements (Out of Scope)

- Email delivery channel integration
- SMS delivery channel integration
- Push notification integration
- WebSocket for real-time delivery
- Notification scheduling (send at specific time)
- Notification batching/digest
