# BE-QA-001: Complete or Remove Email/SMS Integration Stubs

<!-- METADATA (for validation) -->
<!-- TASK_ID: BE-QA-001 -->
<!-- TASK_TITLE: Complete or Remove Email/SMS Integration Stubs -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-14 -->

**Repository:** https://github.com/EvanTenenbaum/TERP
**Task ID:** BE-QA-001
**Estimated Time:** 16h
**Module:** `server/routers/receipts.ts`, `server/routers/quotes.ts`

## Context

**Background:**
Email and SMS integrations are placeholders:
- `server/routers/receipts.ts:490-543` - Email/SMS stubs
- `server/routers/quotes.ts:283-304` - Quote send lacks email notification

Users see UI buttons for these features but nothing happens when clicked.

**Goal:**
Either implement the integrations OR remove the UI that suggests they work.

**Success Criteria:**
- No misleading UI for non-functional features
- If implemented: Email/SMS actually sent
- If removed: UI buttons hidden/disabled

## Implementation Guide

### Option A: Implement Integrations

#### Step A1: Choose Email Provider

Recommended: SendGrid, Resend, or AWS SES

```typescript
// server/services/emailService.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  return resend.emails.send({
    from: "noreply@terp.app",
    to: params.to,
    subject: params.subject,
    html: params.html
  });
}
```

#### Step A2: Choose SMS Provider

Recommended: Twilio

```typescript
// server/services/smsService.ts
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(params: { to: string; body: string }) {
  return client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: params.to,
    body: params.body
  });
}
```

#### Step A3: Update Receipts Router

```typescript
// server/routers/receipts.ts
sendReceipt: protectedProcedure
  .input(z.object({
    receiptId: z.number(),
    method: z.enum(["email", "sms"]),
    destination: z.string()
  }))
  .mutation(async ({ input }) => {
    const receipt = await getReceipt(input.receiptId);
    const html = renderReceiptEmail(receipt);

    if (input.method === "email") {
      await sendEmail({
        to: input.destination,
        subject: `Receipt #${receipt.id}`,
        html
      });
    } else {
      await sendSMS({
        to: input.destination,
        body: `Your receipt: ${receiptUrl}`
      });
    }
  })
```

### Option B: Remove UI

#### Step B1: Find and Disable UI

```bash
grep -rn "email\|sms" client/src/ --include="*.tsx" | grep -i "send\|button"
```

#### Step B2: Hide or Disable Buttons

```tsx
// Hide until implemented
{process.env.FEATURE_EMAIL_ENABLED && (
  <Button onClick={sendEmail}>Send Email</Button>
)}

// Or show disabled with tooltip
<Tooltip content="Coming soon">
  <Button disabled>Send Email</Button>
</Tooltip>
```

## Deliverables

- [ ] Decide: implement or remove
- [ ] If implement: Set up email provider
- [ ] If implement: Set up SMS provider
- [ ] If implement: Update receipts.ts
- [ ] If implement: Update quotes.ts
- [ ] If remove: Hide/disable UI buttons
- [ ] Add feature flag for email/SMS

## Quick Reference

**Files with stubs:**
- `server/routers/receipts.ts:490-543`
- `server/routers/quotes.ts:283-304`

**Environment variables needed:**
```
RESEND_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```
