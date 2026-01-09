# Schema Validation Report

**Generated:** 1/8/2026, 8:45:52 PM

## Executive Summary

- **Total Tables:** 135
- **Total Columns:** 1554
- **Total Issues:** 169

### Issues by Severity

- 🔴 **Critical:** 0
- 🟠 **High:** 116
- 🟡 **Medium:** 53
- ⚪ **Low:** 0

## All Issues by Category

### Missing (112)

- **\_\_drizzle_migrations.id**: Column "id" exists in database but not in Drizzle schema
- **\_\_drizzle_migrations.hash**: Column "hash" exists in database but not in Drizzle schema
- **\_\_drizzle_migrations.created_at**: Column "created_at" exists in database but not in Drizzle schema
- **calendar_event_invitations.deleted_at**: Column "deleted_at" exists in database but not in Drizzle schema
- **calendar_events.module_record_id**: Column "module_record_id" exists in database but not in Drizzle schema
- **calendar_events.meeting_url**: Column "meeting_url" exists in database but not in Drizzle schema
- **calendar_events.recurrence_rule_id**: Column "recurrence_rule_id" exists in database but not in Drizzle schema
- **calendar_events.parent_event_id**: Column "parent_event_id" exists in database but not in Drizzle schema
- **calendar_events.updated_by**: Column "updated_by" exists in database but not in Drizzle schema
- **calendar_recurrence_instances.created_at**: Column "created_at" exists in database but not in Drizzle schema

_... and 102 more_

### Extra (43)

- **calendar_event_invitations.overrideReason**: Column "overrideReason" exists in Drizzle schema but not in database
- **calendar_event_invitations.overriddenAt**: Column "overriddenAt" exists in Drizzle schema but not in database
- **calendar_event_invitations.expiresAt**: Column "expiresAt" exists in Drizzle schema but not in database
- **calendar_event_invitations.createdBy**: Column "createdBy" exists in Drizzle schema but not in database
- **calendar_event_invitations.participantId**: Column "participantId" exists in Drizzle schema but not in database
- **calendar_events.calendarId**: Column "calendarId" exists in Drizzle schema but not in database
- **calendar_events.version**: Column "version" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.eventId**: Column "eventId" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.byDay**: Column "byDay" exists in Drizzle schema but not in database
- **calendar_recurrence_rules.byMonthDay**: Column "byMonthDay" exists in Drizzle schema but not in database

_... and 33 more_

### DataType (4)

- **calendar_events.start_time**: Data type mismatch: DB="time" vs Drizzle="string"
- **calendar_events.end_time**: Data type mismatch: DB="time" vs Drizzle="string"
- **user_permission_overrides.granted**: Data type mismatch: DB="tinyint" vs Drizzle="number"
- **workflow_statuses.isActive**: Data type mismatch: DB="tinyint" vs Drizzle="number"

### Nullable (10)

- **calendar_events.end_date**: Nullable mismatch: DB=true vs Drizzle=false
- **calendar_events.timezone**: Nullable mismatch: DB=false vs Drizzle=true
- **client_needs.created_by**: Nullable mismatch: DB=false vs Drizzle=true
- **permissions.created_at**: Nullable mismatch: DB=true vs Drizzle=false
- **role_permissions.created_at**: Nullable mismatch: DB=true vs Drizzle=false
- **roles.created_at**: Nullable mismatch: DB=true vs Drizzle=false
- **roles.updated_at**: Nullable mismatch: DB=true vs Drizzle=false
- **user_permission_overrides.granted_at**: Nullable mismatch: DB=true vs Drizzle=false
- **user_roles.assigned_at**: Nullable mismatch: DB=true vs Drizzle=false
- **vendor_supply.created_by**: Nullable mismatch: DB=false vs Drizzle=true
