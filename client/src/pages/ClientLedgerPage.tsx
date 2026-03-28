/**
 * ClientLedgerPage
 *
 * Now renders the unified InvoicesSurface which includes an embedded
 * Client Ledger sub-view. The dedicated ClientLedgerPilotSurface and
 * ClientLedgerWorkSurface have been retired (TER-976).
 */

import { lazy, Suspense } from "react";

const InvoicesSurface = lazy(
  () => import("@/components/spreadsheet-native/InvoicesSurface")
);

export default function ClientLedgerPage() {
  return (
    <div className="flex flex-col h-full">
      <Suspense
        fallback={
          <div className="p-4 text-muted-foreground">
            Loading client ledger...
          </div>
        }
      >
        <InvoicesSurface />
      </Suspense>
    </div>
  );
}
