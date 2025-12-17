/**
 * Quick validation script for soft-delete fix
 * Verifies that the implementation correctly filters deleted records
 */
import { getInvoices, getPayments } from "./server/arApDb";

async function validate() {
  console.log("=== Validating Soft-Delete Fix ===\n");
  
  try {
    // Test getInvoices
    console.log("Testing getInvoices()...");
    const invoicesResult = await getInvoices({});
    console.log(`✓ getInvoices returned ${invoicesResult.invoices.length} invoices`);
    
    // Verify no deleted invoices
    const hasDeletedInvoices = invoicesResult.invoices.some((inv: any) => inv.deletedAt !== null);
    if (hasDeletedInvoices) {
      console.error("✗ FAIL: Found invoices with deletedAt !== null");
      process.exit(1);
    }
    console.log("✓ All invoices have deletedAt = null\n");
    
    // Test getPayments
    console.log("Testing getPayments()...");
    const paymentsResult = await getPayments({});
    console.log(`✓ getPayments returned ${paymentsResult.payments.length} payments`);
    
    // Verify no deleted payments
    const hasDeletedPayments = paymentsResult.payments.some((pmt: any) => pmt.deletedAt !== null);
    if (hasDeletedPayments) {
      console.error("✗ FAIL: Found payments with deletedAt !== null");
      process.exit(1);
    }
    console.log("✓ All payments have deletedAt = null\n");
    
    console.log("=== ✅ ALL VALIDATIONS PASSED ===");
    process.exit(0);
  } catch (error) {
    console.error("✗ Validation failed:", error);
    process.exit(1);
  }
}

validate();
