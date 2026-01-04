# Notification Sprint Spec

## Overview

This sprint focuses on creating a unified notification system that consolidates all user alerts, messages, and updates into a single, consistent experience.

## Key Features

- **Unified Notification Service:** A single backend service to handle all notification types.
- **Notification Preferences:** Allow users to customize which notifications they receive.
- **In-App Notification Center:** A UI component to display all notifications.
- **Real-Time Updates:** Use WebSockets for real-time notification delivery.

## Task Breakdown

| Task ID  | Title                                 | Description                                                              |
| -------- | ------------------------------------- | ------------------------------------------------------------------------ |
| NOTIF-01 | Database Schema Changes               | Create `notifications` and `notification_preferences` tables.            |
| NOTIF-02 | Notification Service Refactor         | Create a unified `notificationService` to handle all notification logic. |
| NOTIF-03 | Notifications Router Refactor         | Create a new tRPC router for notifications.                              |
| NOTIF-04 | VIP Portal Notification Endpoints     | Add endpoints for VIP Portal notifications.                              |
| NOTIF-05 | ERP UI Rename (Inbox → Notifications) | Rename the existing "Inbox" to "Notifications" for consistency.          |
| NOTIF-06 | VIP Portal Notification Bell UI       | Add a notification bell icon to the VIP Portal header.                   |
| NOTIF-07 | Notification Preferences UI           | Create a UI for users to manage their notification preferences.          |
