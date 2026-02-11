import type { Page } from "@playwright/test";

export type DomainType = "invoices" | "clients" | "orders" | "list" | "unknown";

export async function validateInvoicePage(page: Page): Promise<boolean> {
  const bodyText = (await page.textContent("body")) || "";
  const hasInvoiceNumber = /INV-\d{8}-\d{5}/.test(bodyText);
  const hasInvoiceHeading =
    (await page
      .locator('h1:has-text("Invoice"), h2:has-text("Invoice")')
      .count()) > 0;
  const hasInvoiceTable = (await page.locator("table").count()) > 0;
  const hasAmountFields = /total|subtotal|amount/i.test(bodyText);

  return (
    hasInvoiceNumber ||
    (hasInvoiceHeading && hasInvoiceTable && hasAmountFields)
  );
}

export async function validateClientPage(page: Page): Promise<boolean> {
  const heading = (await page.locator("h1, h2").first().textContent()) || "";
  const bodyText = (await page.textContent("body")) || "";

  const hasClientHeading = /client|customer/i.test(heading);
  const hasContactInfo = /email|phone|address/i.test(bodyText);
  const hasClientName = /^[A-Z][a-z]+ [A-Z][a-z]+/.test(heading);

  return hasClientHeading || hasContactInfo || hasClientName;
}

export async function validateOrderPage(page: Page): Promise<boolean> {
  const bodyText = (await page.textContent("body")) || "";

  const hasOrderNumber = /ORD-\d+|Order #\d+/i.test(bodyText);
  const hasOrderHeading =
    (await page.locator('h1:has-text("Order"), h2:has-text("Order")').count()) >
      0 ||
    (await page
      .locator('h1:has-text("Orders"), h2:has-text("Orders")')
      .count()) > 0;
  const hasLineItems =
    (await page.locator("table tbody tr").count()) > 0 ||
    (await page.locator("table").count()) > 0;
  const hasOrderStatus = /pending|completed|shipped|delivered|draft|paid/i.test(
    bodyText
  );
  const hasCreateEntry =
    /new order|create sales order|select a customer to begin|select customer/i.test(
      bodyText
    );
  const hasCreateForm =
    (await page
      .locator(
        "form, [role='form'], [role='combobox'], input, button:has-text('Back to Orders')"
      )
      .count()) > 0;
  const hasEmptyState = /no orders found|no order found|no results found/i.test(
    bodyText
  );

  return (
    hasOrderNumber ||
    (hasOrderHeading && (hasLineItems || hasOrderStatus)) ||
    (hasCreateEntry && hasCreateForm) ||
    hasEmptyState
  );
}

export async function validateListPage(page: Page): Promise<boolean> {
  const bodyText = (await page.textContent("body")) || "";
  const hasTable =
    (await page.locator("table tbody tr").count()) > 0 ||
    (await page.locator("table").count()) > 0;
  const hasList =
    (await page.locator('ul li, [role="list"] [role="listitem"]').count()) > 0;
  const hasPagination =
    (await page.locator('[aria-label="pagination"], .pagination').count()) > 0;
  const hasCount =
    /\d+ (items|results|records|batches|orders|clients|invoices)/i.test(
      bodyText
    );
  const hasEmptyState =
    /no (orders|invoices|batches|clients|inventory|results?) found/i.test(
      bodyText
    );
  const hasPrimaryAction =
    /add (batch|client)|new order|refresh|show ar aging/i.test(bodyText);

  return (
    (hasTable || hasList || hasEmptyState) &&
    (hasPagination || hasCount || hasPrimaryAction)
  );
}

export function inferDomainType(path: string): DomainType {
  if (/invoice/i.test(path)) return "invoices";
  if (/client|crm\/clients/i.test(path)) return "clients";
  if (/order/i.test(path)) return "orders";
  if (!path.includes(":")) return "list";
  return "unknown";
}

export async function validateDomainSpecific(
  page: Page,
  path: string
): Promise<boolean> {
  const domain = inferDomainType(path);
  if (domain === "invoices") return validateInvoicePage(page);
  if (domain === "clients") return validateClientPage(page);
  if (domain === "orders") return validateOrderPage(page);
  if (domain === "list") return validateListPage(page);
  return true;
}
