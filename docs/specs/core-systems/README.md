# Core Systems Specifications

This directory contains specifications for cross-cutting system components that serve multiple parts of the TERP application.

## Specifications

| Spec ID | Title | Priority | Status | Estimate |
|---------|-------|----------|--------|----------|
| NOTIF-001 | Unified Notification System Architecture | HIGH | 🔴 Not Started | 32h |

## Overview

Core systems are foundational components that:
- Serve both the ERP application and VIP Portal
- Are dependencies for multiple feature sprints
- Require careful architecture to ensure scalability and maintainability

## NOTIF-001: Unified Notification System

The notification system replaces the current "Inbox" with a unified "Notifications" system that:
- Serves both ERP users and VIP Portal clients
- Supports configurable notification types
- Allows user/client preference management
- Provides in-app delivery with future expansion capability

**Blocking:** VIP-C-001 (Appointment Scheduling System)
