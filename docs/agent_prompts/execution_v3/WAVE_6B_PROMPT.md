# Wave 6B: External Integrations

**Agent Role**: Backend Developer  
**Duration**: 10-12 hours  
**Priority**: P2  
**Timeline**: Week 3-4  
**Can Run Parallel With**: Wave 6A

---

## Overview

Implement external service integrations including email notifications, SMS alerts, and QuickBooks accounting sync.

---

## Task 1: Email Service Integration (3 hours)

### Setup Email Provider

```typescript
// server/services/emailService.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from ?? process.env.EMAIL_FROM ?? 'TERP <noreply@terp.app>',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      reply_to: options.replyTo,
      attachments: options.attachments,
    });

    if (error) {
      console.error('[Email] Send failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('[Email] Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Email templates
export async function sendOrderConfirmationEmail(client: Client, order: Order) {
  const items = await getOrderItems(order.id);
  
  return sendEmail({
    to: client.email,
    subject: `Order Confirmation - #${order.id}`,
    html: renderTemplate('order-confirmation', {
      clientName: client.name,
      orderId: order.id,
      orderDate: format(order.createdAt, 'MMMM d, yyyy'),
      items: items.map(i => ({
        name: i.product.name,
        quantity: i.quantity,
        price: formatCurrency(i.unitPrice),
        total: formatCurrency(i.quantity * i.unitPrice),
      })),
      total: formatCurrency(items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)),
    }),
  });
}

export async function sendInvoiceEmail(invoice: Invoice, client: Client) {
  const pdfBuffer = await generateInvoicePDF(invoice);
  
  return sendEmail({
    to: client.email,
    subject: `Invoice #${invoice.invoiceNumber}`,
    html: renderTemplate('invoice', {
      clientName: client.name,
      invoiceNumber: invoice.invoiceNumber,
      total: formatCurrency(invoice.total),
      dueDate: format(invoice.dueDate, 'MMMM d, yyyy'),
    }),
    attachments: [{
      filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      content: pdfBuffer,
    }],
  });
}

export async function sendPaymentReceiptEmail(payment: Payment, invoice: Invoice) {
  const client = await getClient(invoice.clientId);
  
  return sendEmail({
    to: client.email,
    subject: `Payment Receipt - Invoice #${invoice.invoiceNumber}`,
    html: renderTemplate('payment-receipt', {
      clientName: client.name,
      invoiceNumber: invoice.invoiceNumber,
      paymentAmount: formatCurrency(payment.amount),
      paymentMethod: payment.method,
      paymentDate: format(payment.receivedAt, 'MMMM d, yyyy'),
      remainingBalance: formatCurrency(invoice.total - invoice.paidAmount),
    }),
  });
}

export async function sendQuoteEmail(quote: Quote) {
  const client = await getClient(quote.clientId);
  const pdfBuffer = await generateQuotePDF(quote);
  
  return sendEmail({
    to: client.email,
    subject: `Quote #${quote.id} from TERP`,
    html: renderTemplate('quote', {
      clientName: client.name,
      quoteId: quote.id,
      validUntil: format(quote.validUntil, 'MMMM d, yyyy'),
      total: formatCurrency(quote.total),
    }),
    attachments: [{
      filename: `Quote-${quote.id}.pdf`,
      content: pdfBuffer,
    }],
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/vip/reset-password?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html: renderTemplate('password-reset', {
      resetUrl,
      expiresIn: '24 hours',
    }),
  });
}
```

### Email Templates

```typescript
// server/services/emailTemplates.ts

const templates: Record<string, (data: any) => string> = {
  'order-confirmation': (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }
        .total { font-size: 1.2em; font-weight: bold; text-align: right; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <p>Hi ${data.clientName},</p>
          <p>Thank you for your order! Here are the details:</p>
          
          <p><strong>Order #:</strong> ${data.orderId}<br>
          <strong>Date:</strong> ${data.orderDate}</p>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item: any) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.price}</td>
                  <td>${item.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <p class="total">Order Total: ${data.total}</p>
          
          <p>We'll notify you when your order ships.</p>
        </div>
        <div class="footer">
          <p>Questions? Contact us at support@terp.app</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  // Add other templates...
};

export function renderTemplate(name: string, data: any): string {
  const template = templates[name];
  if (!template) {
    throw new Error(`Email template '${name}' not found`);
  }
  return template(data);
}
```

---

## Task 2: SMS Service Integration (2 hours)

### Setup SMS Provider (Twilio)

```typescript
// server/services/smsService.ts

import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

interface SMSOptions {
  to: string;
  message: string;
}

export async function sendSMS(options: SMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Normalize phone number
    const phoneNumber = normalizePhoneNumber(options.to);
    if (!phoneNumber) {
      return { success: false, error: 'Invalid phone number' };
    }

    const message = await client.messages.create({
      body: options.message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log('[SMS] Sent successfully:', message.sid);
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('[SMS] Send failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function normalizePhoneNumber(phone: string): string | null {
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');
  
  // US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Already has country code
  if (digits.length > 10) {
    return `+${digits}`;
  }
  
  return null;
}

// SMS notification functions
export async function sendOrderShippedSMS(client: Client, order: Order, trackingNumber?: string) {
  if (!client.phone || !client.smsNotifications) return;
  
  let message = `TERP: Your order #${order.id} has shipped!`;
  if (trackingNumber) {
    message += ` Tracking: ${trackingNumber}`;
  }
  
  return sendSMS({ to: client.phone, message });
}

export async function sendPaymentReminderSMS(client: Client, invoice: Invoice) {
  if (!client.phone || !client.smsNotifications) return;
  
  const daysOverdue = differenceInDays(new Date(), invoice.dueDate);
  const balance = invoice.total - invoice.paidAmount;
  
  return sendSMS({
    to: client.phone,
    message: `TERP: Invoice #${invoice.invoiceNumber} is ${daysOverdue} days overdue. Balance: ${formatCurrency(balance)}. Please contact us to arrange payment.`,
  });
}

export async function sendAppointmentReminderSMS(user: User, appointment: Appointment) {
  if (!user.phone || !user.smsNotifications) return;
  
  return sendSMS({
    to: user.phone,
    message: `TERP Reminder: ${appointment.title} at ${format(appointment.startTime, 'h:mm a')} today with ${appointment.clientName}.`,
  });
}
```

---

## Task 3: QuickBooks Integration (5 hours)

### OAuth Setup

```typescript
// server/services/quickbooks/auth.ts

import OAuthClient from 'intuit-oauth';

const oauthClient = new OAuthClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID!,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
  environment: process.env.QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production',
  redirectUri: `${process.env.APP_URL}/api/quickbooks/callback`,
});

export function getAuthorizationUrl(): string {
  return oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: crypto.randomUUID(),
  });
}

export async function handleCallback(url: string): Promise<{ realmId: string; accessToken: string; refreshToken: string }> {
  const authResponse = await oauthClient.createToken(url);
  
  return {
    realmId: authResponse.token.realmId,
    accessToken: authResponse.token.access_token,
    refreshToken: authResponse.token.refresh_token,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  oauthClient.setToken({ refresh_token: refreshToken });
  const authResponse = await oauthClient.refresh();
  
  return {
    accessToken: authResponse.token.access_token,
    refreshToken: authResponse.token.refresh_token,
  };
}
```

### QuickBooks API Client

```typescript
// server/services/quickbooks/client.ts

import QuickBooks from 'node-quickbooks';

export class QuickBooksClient {
  private qbo: QuickBooks;
  
  constructor(realmId: string, accessToken: string) {
    this.qbo = new QuickBooks(
      process.env.QUICKBOOKS_CLIENT_ID,
      process.env.QUICKBOOKS_CLIENT_SECRET,
      accessToken,
      false, // no token secret for OAuth2
      realmId,
      process.env.QUICKBOOKS_ENVIRONMENT === 'sandbox',
      true, // enable debugging
      null, // minor version
      '2.0', // OAuth version
      null // refresh token (handled separately)
    );
  }

  // Customers
  async createCustomer(client: Client): Promise<any> {
    return new Promise((resolve, reject) => {
      this.qbo.createCustomer({
        DisplayName: client.name,
        PrimaryEmailAddr: client.email ? { Address: client.email } : undefined,
        PrimaryPhone: client.phone ? { FreeFormNumber: client.phone } : undefined,
        BillAddr: client.billingAddress ? {
          Line1: client.billingAddress.line1,
          City: client.billingAddress.city,
          CountrySubDivisionCode: client.billingAddress.state,
          PostalCode: client.billingAddress.zip,
        } : undefined,
      }, (err, customer) => {
        if (err) reject(err);
        else resolve(customer);
      });
    });
  }

  async findCustomerByName(name: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.qbo.findCustomers({
        DisplayName: name,
      }, (err, customers) => {
        if (err) reject(err);
        else resolve(customers?.QueryResponse?.Customer?.[0]);
      });
    });
  }

  // Invoices
  async createInvoice(invoice: Invoice, qbCustomerId: string): Promise<any> {
    const items = await getInvoiceItems(invoice.id);
    
    return new Promise((resolve, reject) => {
      this.qbo.createInvoice({
        CustomerRef: { value: qbCustomerId },
        DocNumber: invoice.invoiceNumber,
        TxnDate: format(invoice.createdAt, 'yyyy-MM-dd'),
        DueDate: format(invoice.dueDate, 'yyyy-MM-dd'),
        Line: items.map(item => ({
          Amount: item.total,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: '1' }, // Default item, or map to QB items
            Qty: item.quantity,
            UnitPrice: item.unitPrice,
          },
          Description: item.description,
        })),
      }, (err, qbInvoice) => {
        if (err) reject(err);
        else resolve(qbInvoice);
      });
    });
  }

  // Payments
  async createPayment(payment: Payment, qbCustomerId: string, qbInvoiceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.qbo.createPayment({
        CustomerRef: { value: qbCustomerId },
        TotalAmt: payment.amount,
        TxnDate: format(payment.receivedAt, 'yyyy-MM-dd'),
        Line: [{
          Amount: payment.amount,
          LinkedTxn: [{
            TxnId: qbInvoiceId,
            TxnType: 'Invoice',
          }],
        }],
      }, (err, qbPayment) => {
        if (err) reject(err);
        else resolve(qbPayment);
      });
    });
  }

  // Vendors
  async createVendor(vendor: Vendor): Promise<any> {
    return new Promise((resolve, reject) => {
      this.qbo.createVendor({
        DisplayName: vendor.name,
        PrimaryEmailAddr: vendor.email ? { Address: vendor.email } : undefined,
        PrimaryPhone: vendor.phone ? { FreeFormNumber: vendor.phone } : undefined,
      }, (err, qbVendor) => {
        if (err) reject(err);
        else resolve(qbVendor);
      });
    });
  }

  // Bills (AP)
  async createBill(vendorInvoice: VendorInvoice, qbVendorId: string): Promise<any> {
    const items = await getVendorInvoiceItems(vendorInvoice.id);
    
    return new Promise((resolve, reject) => {
      this.qbo.createBill({
        VendorRef: { value: qbVendorId },
        TxnDate: format(vendorInvoice.createdAt, 'yyyy-MM-dd'),
        DueDate: format(vendorInvoice.dueDate, 'yyyy-MM-dd'),
        Line: items.map(item => ({
          Amount: item.total,
          DetailType: 'AccountBasedExpenseLineDetail',
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: '1' }, // Map to appropriate expense account
          },
          Description: item.description,
        })),
      }, (err, bill) => {
        if (err) reject(err);
        else resolve(bill);
      });
    });
  }
}
```

### Sync Service

```typescript
// server/services/quickbooks/syncService.ts

export class QuickBooksSyncService {
  private client: QuickBooksClient;
  
  constructor(realmId: string, accessToken: string) {
    this.client = new QuickBooksClient(realmId, accessToken);
  }

  async syncClient(clientId: number): Promise<void> {
    const client = await getClient(clientId);
    
    // Check if already synced
    if (client.qbCustomerId) {
      console.log(`[QB Sync] Client ${clientId} already synced`);
      return;
    }

    // Check if exists in QB
    let qbCustomer = await this.client.findCustomerByName(client.name);
    
    if (!qbCustomer) {
      qbCustomer = await this.client.createCustomer(client);
    }

    // Store QB ID
    await db.update(clients)
      .set({ qbCustomerId: qbCustomer.Id })
      .where(eq(clients.id, clientId));

    console.log(`[QB Sync] Client ${clientId} synced to QB customer ${qbCustomer.Id}`);
  }

  async syncInvoice(invoiceId: number): Promise<void> {
    const invoice = await getInvoice(invoiceId);
    
    if (invoice.qbInvoiceId) {
      console.log(`[QB Sync] Invoice ${invoiceId} already synced`);
      return;
    }

    // Ensure client is synced
    await this.syncClient(invoice.clientId);
    const client = await getClient(invoice.clientId);

    // Create invoice in QB
    const qbInvoice = await this.client.createInvoice(invoice, client.qbCustomerId!);

    // Store QB ID
    await db.update(invoices)
      .set({ qbInvoiceId: qbInvoice.Id })
      .where(eq(invoices.id, invoiceId));

    console.log(`[QB Sync] Invoice ${invoiceId} synced to QB invoice ${qbInvoice.Id}`);
  }

  async syncPayment(paymentId: number): Promise<void> {
    const payment = await getPayment(paymentId);
    const invoice = await getInvoice(payment.invoiceId);
    
    if (payment.qbPaymentId) {
      console.log(`[QB Sync] Payment ${paymentId} already synced`);
      return;
    }

    // Ensure invoice is synced
    await this.syncInvoice(payment.invoiceId);
    const client = await getClient(invoice.clientId);

    // Create payment in QB
    const qbPayment = await this.client.createPayment(
      payment,
      client.qbCustomerId!,
      invoice.qbInvoiceId!
    );

    // Store QB ID
    await db.update(payments)
      .set({ qbPaymentId: qbPayment.Id })
      .where(eq(payments.id, paymentId));

    console.log(`[QB Sync] Payment ${paymentId} synced to QB payment ${qbPayment.Id}`);
  }

  async fullSync(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    // Sync all unsynced clients
    const unsyncedClients = await db.query.clients.findMany({
      where: isNull(clients.qbCustomerId),
    });

    for (const client of unsyncedClients) {
      try {
        await this.syncClient(client.id);
        synced++;
      } catch (error) {
        console.error(`[QB Sync] Failed to sync client ${client.id}:`, error);
        errors++;
      }
    }

    // Sync all unsynced invoices
    const unsyncedInvoices = await db.query.invoices.findMany({
      where: isNull(invoices.qbInvoiceId),
    });

    for (const invoice of unsyncedInvoices) {
      try {
        await this.syncInvoice(invoice.id);
        synced++;
      } catch (error) {
        console.error(`[QB Sync] Failed to sync invoice ${invoice.id}:`, error);
        errors++;
      }
    }

    return { synced, errors };
  }
}
```

### API Routes

```typescript
// server/routers/integrations.ts

export const integrationsRouter = router({
  // QuickBooks
  quickbooks: {
    getAuthUrl: protectedProcedure
      .mutation(async () => {
        return { url: getAuthorizationUrl() };
      }),

    getStatus: protectedProcedure
      .query(async () => {
        const settings = await getIntegrationSettings('quickbooks');
        return {
          connected: !!settings?.accessToken,
          lastSync: settings?.lastSyncAt,
          realmId: settings?.realmId,
        };
      }),

    disconnect: protectedProcedure
      .mutation(async () => {
        await deleteIntegrationSettings('quickbooks');
        return { success: true };
      }),

    syncNow: protectedProcedure
      .mutation(async () => {
        const settings = await getIntegrationSettings('quickbooks');
        if (!settings?.accessToken) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'QuickBooks not connected',
          });
        }

        const syncService = new QuickBooksSyncService(
          settings.realmId,
          settings.accessToken
        );

        const result = await syncService.fullSync();

        await updateIntegrationSettings('quickbooks', {
          lastSyncAt: new Date(),
        });

        return result;
      }),
  },

  // Email settings
  email: {
    getSettings: protectedProcedure
      .query(async () => {
        return getIntegrationSettings('email');
      }),

    updateSettings: protectedProcedure
      .input(z.object({
        fromName: z.string(),
        fromEmail: z.string().email(),
        replyTo: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateIntegrationSettings('email', input);
        return { success: true };
      }),

    testEmail: protectedProcedure
      .input(z.object({ to: z.string().email() }))
      .mutation(async ({ input }) => {
        const result = await sendEmail({
          to: input.to,
          subject: 'TERP Test Email',
          html: '<p>This is a test email from TERP. If you received this, email is configured correctly!</p>',
        });
        return result;
      }),
  },

  // SMS settings
  sms: {
    getSettings: protectedProcedure
      .query(async () => {
        const settings = await getIntegrationSettings('sms');
        return {
          enabled: !!settings?.twilioAccountSid,
          phoneNumber: settings?.twilioPhoneNumber,
        };
      }),

    testSMS: protectedProcedure
      .input(z.object({ to: z.string() }))
      .mutation(async ({ input }) => {
        const result = await sendSMS({
          to: input.to,
          message: 'TERP Test: SMS is configured correctly!',
        });
        return result;
      }),
  },
});
```

---

## Task 4: Notification Preferences (2 hours)

### Backend: Notification Settings

```typescript
// server/routers/notifications.ts

export const notificationsRouter = router({
  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const prefs = await db.query.notificationPreferences.findFirst({
        where: eq(notificationPreferences.userId, ctx.user.id),
      });

      return prefs ?? {
        emailOrderConfirmation: true,
        emailInvoice: true,
        emailPaymentReceipt: true,
        emailQuote: true,
        smsOrderShipped: false,
        smsPaymentReminder: false,
        smsAppointmentReminder: true,
        inAppAll: true,
      };
    }),

  updatePreferences: protectedProcedure
    .input(notificationPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      await db.insert(notificationPreferences)
        .values({ userId: ctx.user.id, ...input })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: input,
        });

      return { success: true };
    }),

  // Get notifications for current user
  list: protectedProcedure
    .input(z.object({
      unreadOnly: z.boolean().default(false),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      return db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, ctx.user.id),
          input.unreadOnly ? eq(notifications.read, false) : undefined
        ),
        orderBy: desc(notifications.createdAt),
        limit: input.limit,
      });
    }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(
          eq(notifications.id, input.id),
          eq(notifications.userId, ctx.user.id)
        ));

      return { success: true };
    }),

  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      await db.update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.read, false)
        ));

      return { success: true };
    }),
});

// Notification helper
export async function createNotification(options: {
  userId: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
}) {
  const [notification] = await db.insert(notifications)
    .values(options)
    .returning();

  // Check user preferences and send external notifications
  const prefs = await getUserNotificationPreferences(options.userId);
  const user = await getUser(options.userId);

  // Email notification
  if (prefs.emailAll && user.email) {
    await sendEmail({
      to: user.email,
      subject: options.title,
      html: renderTemplate('notification', {
        title: options.title,
        message: options.message,
        link: options.link ? `${process.env.APP_URL}${options.link}` : undefined,
      }),
    });
  }

  // Push notification (if implemented)
  // await sendPushNotification(options.userId, options);

  return notification;
}
```

---

## Git Workflow

```bash
git checkout -b feat/wave-6b-integrations

git add server/services/emailService.ts server/services/emailTemplates.ts
git commit -m "feat(INT-1): Implement email service with templates"

git add server/services/smsService.ts
git commit -m "feat(INT-2): Implement SMS service with Twilio"

git add server/services/quickbooks/
git commit -m "feat(INT-3): Implement QuickBooks integration"

git add server/routers/integrations.ts server/routers/notifications.ts
git commit -m "feat(INT-4): Add integration management and notification preferences"

git push origin feat/wave-6b-integrations
```

---

## Environment Variables Required

```bash
# Email (Resend)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=TERP <noreply@terp.app>

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# QuickBooks
QUICKBOOKS_CLIENT_ID=xxxxx
QUICKBOOKS_CLIENT_SECRET=xxxxx
QUICKBOOKS_ENVIRONMENT=sandbox # or production
```

---

## Success Criteria

- [ ] Email service sends order confirmations
- [ ] Email service sends invoices with PDF attachment
- [ ] Email service sends payment receipts
- [ ] SMS service sends order shipped notifications
- [ ] SMS service sends payment reminders
- [ ] QuickBooks OAuth flow works
- [ ] QuickBooks syncs customers
- [ ] QuickBooks syncs invoices
- [ ] QuickBooks syncs payments
- [ ] Notification preferences respected
- [ ] Test email/SMS functions work

---

## Handoff

After Wave 6B completion:

1. Document all required environment variables
2. Test integrations in staging environment
3. Create admin documentation for integration setup
4. Coordinate with Wave 6A for VIP portal email notifications

**Next**: Wave 7 (Notifications System, Calendar Integration)
