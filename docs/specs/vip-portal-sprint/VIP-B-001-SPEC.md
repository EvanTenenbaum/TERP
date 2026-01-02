# VIP-B-001: New Backend Features (SSO, PDF Generation)

**Priority:** MEDIUM
**Estimate:** 32 hours
**Status:** Not Started
**Depends On:** VIP-F-001, VIP-A-001

---

## Overview

This specification covers the two remaining backend features from the V3 specification that have not yet been implemented: Single Sign-On (SSO) and PDF generation for invoices and bills.

---

## Task 1: Implement Single Sign-On (24h)

### Requirements

The VIP Portal must support SSO via Google and Microsoft, in addition to the existing email/password authentication.

### Database Schema

The `vipPortalAuth` table already has placeholder fields for SSO:
```sql
googleId VARCHAR(255),
microsoftId VARCHAR(255),
```

### Implementation

**1. Google OAuth (12h)**

Add a Google OAuth flow using the `@react-oauth/google` library:

```tsx
// client/src/pages/vip-portal/VIPLogin.tsx
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={(credentialResponse) => {
    loginWithGoogle.mutate({ credential: credentialResponse.credential });
  }}
  onError={() => {
    toast.error('Google login failed');
  }}
/>
```

Backend endpoint:
```typescript
// server/routers/vipPortal.ts
loginWithGoogle: publicProcedure
  .input(z.object({ credential: z.string() }))
  .mutation(async ({ input }) => {
    // 1. Verify the Google credential
    // 2. Extract email and googleId
    // 3. Find or create vipPortalAuth record
    // 4. Generate session token
    // 5. Return session
  }),
```

**2. Microsoft OAuth (12h)**

Add a Microsoft OAuth flow using the `@azure/msal-react` library:

```tsx
// client/src/pages/vip-portal/VIPLogin.tsx
import { useMsal } from '@azure/msal-react';

const { instance } = useMsal();

const handleMicrosoftLogin = async () => {
  const response = await instance.loginPopup({ scopes: ['openid', 'email'] });
  loginWithMicrosoft.mutate({ accessToken: response.accessToken });
};
```

Backend endpoint:
```typescript
// server/routers/vipPortal.ts
loginWithMicrosoft: publicProcedure
  .input(z.object({ accessToken: z.string() }))
  .mutation(async ({ input }) => {
    // 1. Verify the Microsoft access token
    // 2. Extract email and microsoftId
    // 3. Find or create vipPortalAuth record
    // 4. Generate session token
    // 5. Return session
  }),
```

### Environment Variables Required

```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
MICROSOFT_TENANT_ID=xxx
```

---

## Task 2: Implement PDF Generation (8h)

### Requirements

Clients must be able to download PDF versions of their invoices and bills.

### Implementation

**1. PDF Generation Service (4h)**

Create a new service using `@react-pdf/renderer` or `pdfmake`:

```typescript
// server/services/pdfService.ts
import PDFDocument from 'pdfkit';

export async function generateInvoicePdf(invoiceId: number): Promise<Buffer> {
  const invoice = await getInvoiceById(invoiceId);
  const doc = new PDFDocument();
  
  // Add header with company logo
  // Add invoice details
  // Add line items table
  // Add totals
  // Add payment instructions
  
  return doc;
}
```

**2. Download Endpoint (2h)**

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

**3. Frontend Integration (2h)**

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

### SSO
1. Users can log in with Google OAuth
2. Users can log in with Microsoft OAuth
3. SSO accounts are linked to existing email accounts if the email matches
4. SSO login creates a new account if no matching email exists
5. Session management works identically for SSO and email/password users

### PDF Generation
1. Users can download a PDF of any invoice they have access to
2. PDF includes: company logo, invoice number, date, line items, totals
3. PDF is formatted professionally and is print-ready
4. Download completes within 5 seconds

---

## Testing

1. **SSO Testing:** Test with real Google and Microsoft accounts
2. **PDF Testing:** Verify PDF renders correctly across different invoice types
3. **Security Testing:** Verify users cannot download invoices belonging to other clients

---

## Dependencies

- VIP-F-001 must be complete (frontend rendering bugs fixed)
- VIP-A-001 should be complete (actionability provides the "Download PDF" button)
