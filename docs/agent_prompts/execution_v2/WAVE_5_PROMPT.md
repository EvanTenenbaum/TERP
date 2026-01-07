# Wave 5: Integrations (Post-Thursday)

**Agent Role**: Backend Developer(s)  
**Duration**: 12-16 hours (can split between 2 agents)  
**Priority**: P2  
**Timeline**: Week 2-3  
**Can Run Parallel With**: Wave 4A, 4B (after Thursday)

---

## Overview

Complete email, SMS, and accounting integrations that were deferred for Thursday.

---

## Task 5A: Email Integration

**Agent**: Backend Dev 1  
**Time Estimate**: 6-8 hours

### Setup Email Provider

```typescript
// server/services/emailService.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
}

type EmailTemplate = 
  | 'invoice_created'
  | 'payment_received'
  | 'order_confirmed'
  | 'sample_request'
  | 'password_reset';

export async function sendEmail({ to, subject, template, data }: SendEmailParams) {
  try {
    const html = await renderTemplate(template, data);
    
    const result = await resend.emails.send({
      from: 'TERP <noreply@terp.app>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    
    console.log(`[Email] Sent ${template} to ${to}:`, result.id);
    return { success: true, id: result.id };
  } catch (error) {
    console.error(`[Email] Failed to send ${template} to ${to}:`, error);
    return { success: false, error };
  }
}
```

### Create Email Templates

```typescript
// server/emails/templates/invoice_created.tsx

import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

interface InvoiceCreatedProps {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  viewUrl: string;
}

export function InvoiceCreatedEmail({ 
  clientName, 
  invoiceNumber, 
  amount, 
  dueDate,
  viewUrl 
}: InvoiceCreatedProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text>Hi {clientName},</Text>
          <Text>
            A new invoice #{invoiceNumber} has been created for ${amount.toFixed(2)}.
          </Text>
          <Text>Due date: {dueDate}</Text>
          <Button href={viewUrl}>View Invoice</Button>
        </Container>
      </Body>
    </Html>
  );
}
```

### Integrate with Workflows

```typescript
// server/routers/invoices.ts

create: protectedProcedure
  .input(createInvoiceSchema)
  .mutation(async ({ ctx, input }) => {
    const invoice = await createInvoice(input);
    
    // Send email notification
    const client = await getClient(input.clientId);
    if (client.email) {
      await sendEmail({
        to: client.email,
        subject: `Invoice #${invoice.number} Created`,
        template: 'invoice_created',
        data: {
          clientName: client.name,
          invoiceNumber: invoice.number,
          amount: invoice.total,
          dueDate: invoice.dueDate,
          viewUrl: `${process.env.APP_URL}/invoices/${invoice.id}`,
        },
      });
    }
    
    return invoice;
  }),
```

---

## Task 5B: SMS Integration

**Agent**: Backend Dev 1 (continuation)  
**Time Estimate**: 3-4 hours

### Setup SMS Provider

```typescript
// server/services/smsService.ts

import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface SendSMSParams {
  to: string;
  message: string;
}

export async function sendSMS({ to, message }: SendSMSParams) {
  try {
    // Validate phone number
    const formattedPhone = formatPhoneNumber(to);
    if (!formattedPhone) {
      throw new Error('Invalid phone number');
    }
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });
    
    console.log(`[SMS] Sent to ${to}:`, result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error(`[SMS] Failed to send to ${to}:`, error);
    return { success: false, error };
  }
}

function formatPhoneNumber(phone: string): string | null {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // US number
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  return null;
}
```

### SMS Templates

```typescript
// server/services/smsTemplates.ts

export const smsTemplates = {
  orderConfirmed: (orderNumber: string) => 
    `Your order #${orderNumber} has been confirmed. Track at terp.app/orders`,
  
  paymentReceived: (amount: number, invoiceNumber: string) =>
    `Payment of $${amount.toFixed(2)} received for invoice #${invoiceNumber}. Thank you!`,
  
  deliveryScheduled: (date: string, time: string) =>
    `Your delivery is scheduled for ${date} at ${time}. Reply CONFIRM to confirm.`,
};
```

---

## Task 5C: Accounting Integration

**Agent**: Backend Dev 2  
**Time Estimate**: 6-8 hours

### QuickBooks Integration

```typescript
// server/services/quickbooksService.ts

import QuickBooks from 'node-quickbooks';

const qb = new QuickBooks(
  process.env.QB_CLIENT_ID,
  process.env.QB_CLIENT_SECRET,
  process.env.QB_ACCESS_TOKEN,
  false, // no token secret for OAuth2
  process.env.QB_REALM_ID,
  true, // use sandbox
  true, // debug
  null, // minor version
  '2.0', // OAuth version
  process.env.QB_REFRESH_TOKEN
);

export async function syncInvoiceToQuickBooks(invoice: Invoice) {
  try {
    // Map TERP invoice to QB format
    const qbInvoice = {
      Line: invoice.items.map(item => ({
        Amount: item.total,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { value: item.productId.toString() },
          Qty: item.quantity,
          UnitPrice: item.price,
        },
      })),
      CustomerRef: { value: invoice.clientId.toString() },
      DueDate: invoice.dueDate,
    };
    
    const result = await new Promise((resolve, reject) => {
      qb.createInvoice(qbInvoice, (err, invoice) => {
        if (err) reject(err);
        else resolve(invoice);
      });
    });
    
    console.log(`[QB] Synced invoice ${invoice.id}:`, result);
    return { success: true, qbId: result.Id };
  } catch (error) {
    console.error(`[QB] Failed to sync invoice ${invoice.id}:`, error);
    return { success: false, error };
  }
}

export async function syncPaymentToQuickBooks(payment: Payment) {
  // Similar implementation
}
```

### Sync Queue

```typescript
// server/services/syncQueue.ts

import Bull from 'bull';

const syncQueue = new Bull('accounting-sync', process.env.REDIS_URL);

syncQueue.process('sync-invoice', async (job) => {
  const { invoiceId } = job.data;
  const invoice = await getInvoice(invoiceId);
  return syncInvoiceToQuickBooks(invoice);
});

syncQueue.process('sync-payment', async (job) => {
  const { paymentId } = job.data;
  const payment = await getPayment(paymentId);
  return syncPaymentToQuickBooks(payment);
});

// Add to queue when invoice created
export function queueInvoiceSync(invoiceId: number) {
  return syncQueue.add('sync-invoice', { invoiceId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}
```

---

## Task 5D: Notification Preferences

**Agent**: Backend Dev 2 (continuation)  
**Time Estimate**: 2-3 hours

### User Preferences Schema

```typescript
// server/db/schema/notificationPreferences.ts

export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  clientId: integer('client_id').references(() => clients.id),
  
  // Email preferences
  emailInvoiceCreated: boolean('email_invoice_created').default(true),
  emailPaymentReceived: boolean('email_payment_received').default(true),
  emailOrderConfirmed: boolean('email_order_confirmed').default(true),
  
  // SMS preferences
  smsOrderConfirmed: boolean('sms_order_confirmed').default(false),
  smsDeliveryUpdates: boolean('sms_delivery_updates').default(false),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Preferences API

```typescript
// server/routers/notifications.ts

export const notificationsRouter = router({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, ctx.user.id),
    });
  }),
  
  updatePreferences: protectedProcedure
    .input(updatePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      return db
        .update(notificationPreferences)
        .set(input)
        .where(eq(notificationPreferences.userId, ctx.user.id));
    }),
});
```

---

## Git Workflow

```bash
# Agent 1: Email & SMS
git checkout -b feat/wave-5a-email-sms

git add server/services/emailService.ts server/emails/
git commit -m "feat: Add email service with templates"

git add server/services/smsService.ts
git commit -m "feat: Add SMS service with Twilio"

git push origin feat/wave-5a-email-sms

# Agent 2: Accounting
git checkout -b feat/wave-5b-accounting

git add server/services/quickbooksService.ts
git commit -m "feat: Add QuickBooks integration"

git add server/services/syncQueue.ts
git commit -m "feat: Add accounting sync queue"

git add server/db/schema/notificationPreferences.ts
git commit -m "feat: Add notification preferences"

git push origin feat/wave-5b-accounting
```

---

## Success Criteria

- [ ] Email service working
- [ ] Email templates created
- [ ] SMS service working
- [ ] QuickBooks sync working
- [ ] Sync queue implemented
- [ ] Notification preferences working
- [ ] All integrations tested
