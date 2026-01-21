/**
 * Email Service
 * API-016: Provides email sending functionality for quotes, receipts, and notifications
 *
 * Supports:
 * - Resend (primary, recommended)
 * - SendGrid (alternative)
 * - Logs-only mode when no provider configured
 *
 * Configuration:
 * - FEATURE_EMAIL_ENABLED=true to enable
 * - RESEND_API_KEY for Resend
 * - SENDGRID_API_KEY for SendGrid
 */

import { logger } from "../_core/logger";
import { FEATURE_FLAGS } from "../utils/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: "resend" | "sendgrid" | "mock";
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_FROM_EMAIL =
  process.env.EMAIL_FROM || "TERP <noreply@terp.local>";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// ============================================================================
// EMAIL PROVIDERS
// ============================================================================

/**
 * Send email via Resend API
 */
async function sendViaResend(options: EmailOptions): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const payload = {
    from: options.from || DEFAULT_FROM_EMAIL,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
    reply_to: options.replyTo,
    cc: options.cc
      ? Array.isArray(options.cc)
        ? options.cc
        : [options.cc]
      : undefined,
    bcc: options.bcc
      ? Array.isArray(options.bcc)
        ? options.bcc
        : [options.bcc]
      : undefined,
    // Attachments require base64 encoding for Resend
    attachments: options.attachments?.map(a => ({
      filename: a.filename,
      content:
        typeof a.content === "string"
          ? a.content
          : a.content.toString("base64"),
      content_type: a.contentType,
    })),
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(
      { status: response.status, body: errorBody },
      "[Email] Resend API error"
    );
    return {
      success: false,
      error: `Resend API error: ${response.status}`,
      provider: "resend",
    };
  }

  const result = await response.json();

  return {
    success: true,
    messageId: result.id,
    provider: "resend",
  };
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY not configured");
  }

  const payload = {
    personalizations: [
      {
        to: (Array.isArray(options.to) ? options.to : [options.to]).map(
          email => ({
            email,
          })
        ),
        cc: options.cc
          ? (Array.isArray(options.cc) ? options.cc : [options.cc]).map(
              email => ({ email })
            )
          : undefined,
        bcc: options.bcc
          ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]).map(
              email => ({ email })
            )
          : undefined,
      },
    ],
    from: { email: options.from || DEFAULT_FROM_EMAIL },
    reply_to: options.replyTo ? { email: options.replyTo } : undefined,
    subject: options.subject,
    content: [
      { type: "text/html", value: options.html },
      ...(options.text ? [{ type: "text/plain", value: options.text }] : []),
    ],
    attachments: options.attachments?.map(a => ({
      filename: a.filename,
      content:
        typeof a.content === "string"
          ? Buffer.from(a.content).toString("base64")
          : a.content.toString("base64"),
      type: a.contentType || "application/octet-stream",
    })),
  };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(
      { status: response.status, body: errorBody },
      "[Email] SendGrid API error"
    );
    return {
      success: false,
      error: `SendGrid API error: ${response.status}`,
      provider: "sendgrid",
    };
  }

  // SendGrid returns 202 with no body on success
  const messageId = response.headers.get("x-message-id") || undefined;

  return {
    success: true,
    messageId,
    provider: "sendgrid",
  };
}

/**
 * Mock send for development/testing
 */
async function sendMock(options: EmailOptions): Promise<EmailResult> {
  logger.info(
    {
      to: options.to,
      subject: options.subject,
      htmlLength: options.html.length,
    },
    "[Email] Mock send - email not actually sent (email disabled or no provider configured)"
  );

  return {
    success: true,
    messageId: `mock-${Date.now()}`,
    provider: "mock",
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Check if email sending is enabled and configured
 */
export function isEmailEnabled(): boolean {
  return (
    FEATURE_FLAGS.EMAIL_ENABLED && Boolean(RESEND_API_KEY || SENDGRID_API_KEY)
  );
}

/**
 * Get the configured email provider
 */
export function getEmailProvider(): "resend" | "sendgrid" | "none" {
  if (RESEND_API_KEY) return "resend";
  if (SENDGRID_API_KEY) return "sendgrid";
  return "none";
}

/**
 * Send an email
 *
 * @param options - Email options (to, subject, html, etc.)
 * @returns Result with success status and message ID
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // Validate required fields
  if (!options.to || !options.subject || !options.html) {
    return {
      success: false,
      error: "Missing required fields: to, subject, html",
    };
  }

  // Check if email is enabled
  if (!FEATURE_FLAGS.EMAIL_ENABLED) {
    logger.debug(
      { to: options.to, subject: options.subject },
      "[Email] Email feature disabled, using mock"
    );
    return sendMock(options);
  }

  // Try providers in order of preference
  try {
    if (RESEND_API_KEY) {
      logger.debug(
        { to: options.to, subject: options.subject },
        "[Email] Sending via Resend"
      );
      return await sendViaResend(options);
    }

    if (SENDGRID_API_KEY) {
      logger.debug(
        { to: options.to, subject: options.subject },
        "[Email] Sending via SendGrid"
      );
      return await sendViaSendGrid(options);
    }

    // No provider configured
    logger.warn(
      { to: options.to, subject: options.subject },
      "[Email] No email provider configured, using mock"
    );
    return sendMock(options);
  } catch (error) {
    logger.error({ error }, "[Email] Failed to send email");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Generate quote email HTML
 */
export function generateQuoteEmailHtml(data: {
  quoteNumber: string;
  clientName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
  validUntil: string;
  notes?: string;
  viewUrl?: string;
}): string {
  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  const itemRows = data.items
    .map(
      item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total)}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px;">
      <h1 style="margin: 0; color: #333; font-size: 28px;">Quote</h1>
      <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">${data.quoteNumber}</p>
    </div>

    <!-- Greeting -->
    <p style="color: #333; font-size: 16px; line-height: 1.6;">
      Dear ${data.clientName},
    </p>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">
      Thank you for your interest. Please find your quote below.
    </p>

    <!-- Items Table -->
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #eee;">Qty</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #eee;">Unit Price</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #eee;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Subtotal:</td>
          <td style="padding: 12px; text-align: right;">${formatCurrency(data.subtotal)}</td>
        </tr>
        <tr style="background: #10b981; color: white;">
          <td colspan="3" style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px;">Total:</td>
          <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px;">${formatCurrency(data.total)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Valid Until -->
    <div style="background: #fef3c7; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Valid Until:</strong> ${new Date(data.validUntil).toLocaleDateString("en-US", { dateStyle: "long" })}
      </p>
    </div>

    ${
      data.notes
        ? `
    <!-- Notes -->
    <div style="background: #f9fafb; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 5px 0; color: #333; font-weight: bold; font-size: 14px;">Notes:</p>
      <p style="margin: 0; color: #666; font-size: 14px;">${data.notes}</p>
    </div>
    `
        : ""
    }

    ${
      data.viewUrl
        ? `
    <!-- View Quote Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.viewUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
        View Quote Online
      </a>
    </div>
    `
        : ""
    }

    <!-- Footer -->
    <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
      <p style="margin: 0; color: #999; font-size: 12px;">
        This quote was generated automatically. Please contact us if you have any questions.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generate plain text version of quote email
 */
export function generateQuoteEmailText(data: {
  quoteNumber: string;
  clientName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
  validUntil: string;
  notes?: string;
}): string {
  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  const itemLines = data.items
    .map(
      item =>
        `  - ${item.name}: ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}`
    )
    .join("\n");

  return `
QUOTE: ${data.quoteNumber}

Dear ${data.clientName},

Thank you for your interest. Please find your quote below.

ITEMS:
${itemLines}

Subtotal: ${formatCurrency(data.subtotal)}
TOTAL: ${formatCurrency(data.total)}

Valid Until: ${new Date(data.validUntil).toLocaleDateString("en-US", { dateStyle: "long" })}

${data.notes ? `Notes: ${data.notes}\n` : ""}
---
This quote was generated automatically. Please contact us if you have any questions.
`.trim();
}
