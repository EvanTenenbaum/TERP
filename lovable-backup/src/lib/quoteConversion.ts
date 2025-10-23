import { Order, OrderLine } from "@/types/entities";
import { QuoteLine } from "@/components/quotes/QuoteBuilder";
import { createAuditEntry } from "./audit";

export interface ConversionResult {
  success: boolean;
  orderId?: string;
  message: string;
}

/**
 * Convert a quote to a sales order
 */
export function convertQuoteToOrder(
  quoteId: string,
  clientId: string,
  lines: QuoteLine[],
  notes?: string
): ConversionResult {
  try {
    const orderId = `ORD-${Date.now()}`;
    
    const orderLines: OrderLine[] = lines.map((quoteLine, index) => ({
      id: `OL-${Date.now()}-${index}`,
      order_id: orderId,
      inventory_id: quoteLine.inventory_id,
      inventory_name: quoteLine.inventory_name,
      qty: quoteLine.qty,
      unit_price: quoteLine.unit_price,
      discount_pct: 0,
      discount_amt: 0,
      line_total: quoteLine.line_total,
      line_number: index + 1,
      notes: "",
    }));

    const order: Partial<Order> = {
      id: orderId,
      client_id: clientId,
      status: "Draft",
      total: lines.reduce((sum, line) => sum + line.line_total, 0),
      balance_due: lines.reduce((sum, line) => sum + line.line_total, 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: false,
    };

    // Create audit entry
    createAuditEntry({
      action: "convert_quote_to_order",
      entity_type: "quote",
      entity_id: quoteId,
      after: { order_id: orderId, status: "converted" },
      ui_context: "quote_conversion",
      module: "sales",
    });

    createAuditEntry({
      action: "create_from_quote",
      entity_type: "order",
      entity_id: orderId,
      after: order,
      ui_context: "quote_conversion",
      module: "sales",
    });

    return {
      success: true,
      orderId,
      message: `Quote ${quoteId} successfully converted to Order ${orderId}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to convert quote: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Check if a quote can be converted (not expired, has lines, etc.)
 */
export function canConvertQuote(expiresAt: string, hasLines: boolean): boolean {
  const expirationDate = new Date(expiresAt);
  const today = new Date();
  
  return expirationDate >= today && hasLines;
}
