# FEATURE-019: Signal Messaging System

## Overview

Implement a messaging system that allows TERP users to send messages to clients via the Signal app for secure, encrypted communication.

## Problem Statement

Currently, TERP has no built-in messaging capability for communicating with clients. Users need a secure, privacy-focused way to send order updates, reminders, and other communications to clients without relying on less secure channels like SMS or email.

## Objectives

1. Integrate with Signal messaging protocol for end-to-end encrypted communication
2. Enable users to send messages to clients directly from the TERP interface
3. Provide message templates for common communications
4. Track message delivery status and maintain message history
5. Ensure compliance with privacy regulations

## Technical Approach

### Signal Integration Options

1. **signal-cli** - Command-line interface for Signal
   - Pros: Well-documented, actively maintained
   - Cons: Requires Java runtime, CLI-based

2. **signald** - Daemon for Signal
   - Pros: JSON-based API, easier integration
   - Cons: Requires separate daemon process

3. **Signal Business API** (if available)
   - Pros: Official support
   - Cons: May have restrictions for business use

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   TERP UI       │────▶│  Message Service │────▶│  Signal API │
│  (React)        │     │  (Node.js)       │     │  (signald)  │
└─────────────────┘     └──────────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   Message Queue  │
                        │   (Bull/Redis)   │
                        └──────────────────┘
```

### Database Schema

```sql
-- Client Signal phone number (add to clients table)
ALTER TABLE clients ADD COLUMN signal_phone VARCHAR(20);
ALTER TABLE clients ADD COLUMN signal_opt_in BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN signal_opt_in_date TIMESTAMP;

-- Message log table
CREATE TABLE signal_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL REFERENCES clients(id),
  sender_user_id INT NOT NULL REFERENCES users(id),
  template_id INT REFERENCES signal_message_templates(id),
  content TEXT NOT NULL,
  status ENUM('queued', 'sent', 'delivered', 'read', 'failed') DEFAULT 'queued',
  error_message TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_client_id (client_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Message templates
CREATE TABLE signal_message_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  variables JSON, -- e.g., ["clientName", "orderNumber", "amount"]
  category ENUM('order', 'reminder', 'promotion', 'general') DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### API Endpoints (tRPC)

```typescript
// server/routers/signalMessaging.ts
export const signalMessagingRouter = router({
  // Send a message to a client
  sendMessage: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      content: z.string(),
      templateId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Get message history for a client
  getMessageHistory: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => { ... }),

  // Template management
  listTemplates: protectedProcedure.query(...),
  createTemplate: protectedProcedure.input(...).mutation(...),
  updateTemplate: protectedProcedure.input(...).mutation(...),
  deleteTemplate: protectedProcedure.input(...).mutation(...),

  // Bulk messaging
  sendBulkMessage: protectedProcedure
    .input(z.object({
      clientIds: z.array(z.number()),
      content: z.string(),
      templateId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Client opt-in management
  updateClientOptIn: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      optIn: z.boolean(),
      phoneNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),
});
```

## UI Components

### Client Profile - Messaging Section

- Signal phone number field with opt-in toggle
- Quick-send buttons for common messages
- Message history accordion/drawer
- Compose new message form

### Message Composer

- Rich text input (or plain text for Signal)
- Template selector dropdown
- Variable substitution preview
- Send button with confirmation

### Message Templates Page

- List of templates with categories
- Create/edit template form
- Variable placeholder helper
- Preview with sample data

## Security Considerations

1. **End-to-End Encryption**: Signal provides E2E encryption by default
2. **Credential Storage**: Signal account credentials must be securely stored (environment variables, secrets manager)
3. **Rate Limiting**: Implement rate limits to prevent spam/abuse
4. **Audit Logging**: Log all message sends for compliance
5. **Opt-In Tracking**: Track client consent for messaging
6. **Data Retention**: Implement configurable message retention policies

## Dependencies

- Signal integration library (signal-cli or signald)
- Message queue (Bull + Redis) for reliable delivery
- Background job processor for async message sending

## Acceptance Criteria

- [ ] Users can send Signal messages to clients from client profile
- [ ] Message delivery status is tracked and displayed
- [ ] Message templates can be created and managed
- [ ] Message history is viewable per client
- [ ] Bulk messaging works with rate limiting
- [ ] Client opt-in/opt-out is tracked
- [ ] All messages are logged for audit
- [ ] Error handling for failed messages
- [ ] Unit tests for message service
- [ ] Integration tests for Signal API

## Estimate

- **Phase 1**: Signal integration setup + basic messaging (1d)
- **Phase 2**: UI components + templates (1d)
- **Total**: 2 days

## Notes

- Signal requires a dedicated phone number for the business account
- Consider fallback options if Signal is unavailable
- May need to handle Signal's rate limits for bulk messaging
- Future enhancement: Two-way messaging (receive client replies)
