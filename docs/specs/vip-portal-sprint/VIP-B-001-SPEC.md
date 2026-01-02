# VIP-B-001: PDF Generation for Invoices/Bills

**Priority:** MEDIUM
**Estimate:** 8 hours
**Status:** Not Started
**Depends On:** VIP-F-001, VIP-A-001

---

## Overview

This specification covers the implementation of PDF generation for invoices and bills in the VIP Portal. This allows clients to download professional, print-ready documents of their financial records.

**Note:** The SSO feature (Google/Microsoft login) has been removed from this specification and replaced with the Appointment Scheduling System (VIP-C-001).

---

## Implementation

### 1. PDF Generation Service (4h)

Create a new service using `pdfkit` or `@react-pdf/renderer`:

```typescript
// server/services/pdfService.ts
import PDFDocument from 'pdfkit';

export async function generateInvoicePdf(invoiceId: number): Promise<Buffer> {
  const invoice = await getInvoiceById(invoiceId);
  const doc = new PDFDocument();
  
  // Add header with company logo
  // Add invoice details (number, date, due date)
  // Add client information
  // Add line items table
  // Add totals (subtotal, tax, total)
  // Add payment instructions
  
  return doc;
}
```

### 2. Download Endpoint (2h)

```typescript
// server/routers/vipPortal.ts
downloadInvoicePdf: vipPortalProcedure
  .input(z.object({ invoiceId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    // 1. Verify the invoice belongs to this client
    // 2. Generate PDF
    // 3. Return as base64 or signed URL
  }),
```

### 3. Frontend Integration (2h)

```tsx
// In the invoice detail view
<Button
  onClick={async () => {
    const result = await downloadInvoicePdf.mutateAsync({ invoiceId });
    // Trigger browser download
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${result.pdf}`;
    link.download = `invoice-${invoiceId}.pdf`;
    link.click();
  }}
>
  Download PDF
</Button>
```

---

## Acceptance Criteria

1. Users can download a PDF of any invoice they have access to
2. PDF includes: company logo, invoice number, date, line items, totals
3. PDF is formatted professionally and is print-ready
4. Download completes within 5 seconds

---

## Testing

1. **PDF Testing:** Verify PDF renders correctly across different invoice types
2. **Security Testing:** Verify users cannot download invoices belonging to other clients

---

## Dependencies

- VIP-F-001 must be complete (frontend rendering bugs fixed)
- VIP-A-001 should be complete (actionability provides the "Download PDF" button)
