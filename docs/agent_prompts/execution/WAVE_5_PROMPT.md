# Wave 5: Integrations

**Timeline**: Week 2-3  
**Total Duration**: 12-16 hours  
**Dependencies**: Wave 4 complete  
**Parallel Execution**: Agent 1 and Agent 2 can work simultaneously

---

## Agent 1: Communication Integrations

**Role**: Backend Developer (Email/SMS)  
**Duration**: 10-15 hours

### Task 1: INT-001 - Email Service (SendGrid)

**Files**: `server/routers/receipts.ts`, `server/services/emailService.ts`  
**Time Estimate**: 4-6 hours

**Requirements**:
- Send invoice emails to clients
- Send order confirmation emails
- Send payment receipt emails

**Implementation**:

```typescript
// server/services/emailService.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
  }>;
}

export async function sendEmail(options: EmailOptions) {
  const msg = {
    to: options.to,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  };
  
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
}

// Email templates
export function invoiceEmailTemplate(invoice: Invoice, client: Client) {
  return `
    <h1>Invoice #${invoice.number}</h1>
    <p>Dear ${client.name},</p>
    <p>Please find attached your invoice for ${formatCurrency(invoice.total)}.</p>
    <p>Due date: ${formatDate(invoice.dueDate)}</p>
    <p>Thank you for your business!</p>
  `;
}

export function orderConfirmationTemplate(order: Order, client: Client) {
  return `
    <h1>Order Confirmation</h1>
    <p>Dear ${client.name},</p>
    <p>Your order #${order.number} has been confirmed.</p>
    <p>Total: ${formatCurrency(order.total)}</p>
    <p>Estimated delivery: ${formatDate(order.estimatedDelivery)}</p>
  `;
}
```

**Router Integration**:
```typescript
// server/routers/receipts.ts
sendInvoiceEmail: protectedProcedure
  .input(z.object({ invoiceId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const invoice = await getInvoiceById(input.invoiceId);
    const client = await getClientById(invoice.clientId);
    
    await sendEmail({
      to: client.email,
      subject: `Invoice #${invoice.number}`,
      html: invoiceEmailTemplate(invoice, client),
    });
    
    // Log email sent
    await logActivity({
      type: 'EMAIL_SENT',
      entityType: 'invoice',
      entityId: invoice.id,
      description: `Invoice email sent to ${client.email}`,
    });
    
    return { success: true };
  }),
```

---

### Task 2: INT-002 - SMS Service (Twilio)

**Files**: `server/services/smsService.ts`  
**Time Estimate**: 4-6 hours

**Requirements**:
- Send delivery notifications
- Send payment reminders
- Send order status updates

**Implementation**:

```typescript
// server/services/smsService.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface SMSOptions {
  to: string;
  body: string;
}

export async function sendSMS(options: SMSOptions) {
  try {
    const message = await client.messages.create({
      body: options.body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: options.to,
    });
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('SMS send error:', error);
    throw new Error('Failed to send SMS');
  }
}

// SMS templates
export function deliveryNotificationSMS(order: Order, client: Client) {
  return `Hi ${client.name}, your order #${order.number} is out for delivery. Expected arrival: ${formatTime(order.estimatedDelivery)}`;
}

export function paymentReminderSMS(invoice: Invoice, client: Client) {
  return `Hi ${client.name}, reminder: Invoice #${invoice.number} for ${formatCurrency(invoice.total)} is due ${formatDate(invoice.dueDate)}. Questions? Call us.`;
}
```

---

### Task 3: INT-006 - Calendar Email Notifications

**Files**: `server/_core/calendarJobs.ts`  
**Time Estimate**: 2-3 hours

**Requirements**:
- Send reminder emails for upcoming events
- Send daily digest of scheduled deliveries

**Implementation**:

```typescript
// server/_core/calendarJobs.ts
import { CronJob } from 'cron';
import { sendEmail } from '../services/emailService';

// Daily digest at 7 AM
export const dailyDigestJob = new CronJob('0 7 * * *', async () => {
  const today = new Date();
  const events = await getEventsForDate(today);
  
  if (events.length === 0) return;
  
  const users = await getUsersWithCalendarAccess();
  
  for (const user of users) {
    await sendEmail({
      to: user.email,
      subject: `Daily Schedule - ${formatDate(today)}`,
      html: dailyDigestTemplate(events),
    });
  }
});

// Event reminder 1 hour before
export const eventReminderJob = new CronJob('*/15 * * * *', async () => {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  const events = await getEventsStartingAt(oneHourFromNow);
  
  for (const event of events) {
    if (event.reminderSent) continue;
    
    await sendEmail({
      to: event.assignee.email,
      subject: `Reminder: ${event.title} in 1 hour`,
      html: eventReminderTemplate(event),
    });
    
    await markReminderSent(event.id);
  }
});
```

---

## Agent 2: Accounting Integrations

**Role**: Backend Developer (Accounting)  
**Duration**: 7-10 hours

### Task 4: INT-003 - Invoice → Accounting Sync

**Files**: `server/ordersDb.ts`, `server/accountingDb.ts`  
**Time Estimate**: 3-4 hours

**Requirements**:
- When invoice is created, create AR entry
- When invoice is paid, update AR entry
- Maintain accurate AR aging

**Implementation**:

```typescript
// server/ordersDb.ts - after invoice creation
export async function createInvoice(data: CreateInvoiceInput) {
  const invoice = await db.insert(invoices).values(data).returning();
  
  // Create AR entry
  await createAREntry({
    invoiceId: invoice.id,
    clientId: invoice.clientId,
    amount: invoice.total,
    dueDate: invoice.dueDate,
    status: 'OPEN',
  });
  
  return invoice;
}

// server/accountingDb.ts
export async function createAREntry(data: CreateARInput) {
  return db.insert(accountsReceivable).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function updateAROnPayment(invoiceId: number, paymentAmount: number) {
  const ar = await db.select()
    .from(accountsReceivable)
    .where(eq(accountsReceivable.invoiceId, invoiceId))
    .limit(1);
  
  if (!ar[0]) return;
  
  const newBalance = ar[0].amount - paymentAmount;
  
  await db.update(accountsReceivable)
    .set({
      paidAmount: sql`${accountsReceivable.paidAmount} + ${paymentAmount}`,
      status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
      updatedAt: new Date(),
    })
    .where(eq(accountsReceivable.id, ar[0].id));
}
```

---

### Task 5: INT-004 - Payment → Credit Update

**Files**: `server/ordersDb.ts`, `server/services/creditEngine.ts`  
**Time Estimate**: 2-3 hours

**Requirements**:
- When payment is recorded, update client credit balance
- Track credit history

**Implementation**:

```typescript
// server/ordersDb.ts - after payment recording
export async function recordPayment(data: RecordPaymentInput) {
  const payment = await db.insert(payments).values(data).returning();
  
  // Update AR
  await updateAROnPayment(data.invoiceId, data.amount);
  
  // Update client credit balance
  await updateClientCredit(data.clientId, data.amount);
  
  return payment;
}

// server/services/creditEngine.ts
export async function updateClientCredit(clientId: number, paymentAmount: number) {
  // Get client's current credit info
  const client = await db.select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  
  if (!client[0]) return;
  
  // Calculate new credit balance
  const newBalance = client[0].creditBalance - paymentAmount;
  
  await db.update(clients)
    .set({
      creditBalance: newBalance,
      lastPaymentDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));
  
  // Log credit history
  await db.insert(creditHistory).values({
    clientId,
    type: 'PAYMENT',
    amount: paymentAmount,
    balanceAfter: newBalance,
    createdAt: new Date(),
  });
}
```

---

### Task 6: INT-005 - Order → Cash Payment

**Files**: `server/ordersDb.ts`  
**Time Estimate**: 2-3 hours

**Requirements**:
- Support cash payment at delivery
- Auto-create invoice and payment for COD orders

**Implementation**:

```typescript
// server/ordersDb.ts
export async function completeOrderWithCashPayment(orderId: number) {
  const order = await getOrderById(orderId);
  
  // Create invoice
  const invoice = await createInvoice({
    orderId: order.id,
    clientId: order.clientId,
    total: order.total,
    dueDate: new Date(), // Due immediately for cash
    status: 'PAID',
  });
  
  // Record cash payment
  await recordPayment({
    invoiceId: invoice.id,
    clientId: order.clientId,
    amount: order.total,
    method: 'CASH',
    reference: `COD-${order.number}`,
  });
  
  // Update order status
  await db.update(orders)
    .set({
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
  
  return { order, invoice };
}
```

---

## Git Workflow

### Agent 1:
```bash
git checkout -b feat/wave-5-communications

git add server/services/emailService.ts
git commit -m "feat(INT-001): Add SendGrid email service"

git add server/services/smsService.ts
git commit -m "feat(INT-002): Add Twilio SMS service"

git add server/_core/calendarJobs.ts
git commit -m "feat(INT-006): Add calendar email notifications"

git push origin feat/wave-5-communications
```

### Agent 2:
```bash
git checkout -b feat/wave-5-accounting

git add server/ordersDb.ts server/accountingDb.ts
git commit -m "feat(INT-003): Add invoice to AR sync"

git add server/services/creditEngine.ts
git commit -m "feat(INT-004): Add payment to credit sync"

git add server/ordersDb.ts
git commit -m "feat(INT-005): Add COD payment support"

git push origin feat/wave-5-accounting
```

---

## Success Criteria

### Agent 1:
- [ ] Emails send successfully via SendGrid
- [ ] SMS sends successfully via Twilio
- [ ] Calendar reminders work
- [ ] All notifications logged

### Agent 2:
- [ ] AR entries created with invoices
- [ ] AR updated on payments
- [ ] Credit balances accurate
- [ ] COD orders work end-to-end

---

## Environment Variables Required

```env
# Email (SendGrid)
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@yourcompany.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```
