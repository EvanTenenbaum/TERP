import { buildSalesIdentityDescriptor } from "./filtering";

export interface CatalogueOutboundIdentityItem {
  brand?: string | null;
  vendor?: string | null;
  category?: string | null;
  subcategory?: string | null;
  batchSku?: string | null;
}

export function buildCatalogueOutboundDescriptor(
  item: CatalogueOutboundIdentityItem
) {
  return buildSalesIdentityDescriptor(item);
}

export function hasCatalogueIdentityGap(item: CatalogueOutboundIdentityItem) {
  return !(item.brand || item.vendor) || !item.batchSku;
}

export function buildCatalogueConfirmationNote() {
  return "Pricing, availability, and payment terms are subject to final confirmation.";
}

export function buildCatalogueIdentityWarning(
  items: CatalogueOutboundIdentityItem[]
) {
  const gapCount = items.filter(hasCatalogueIdentityGap).length;
  if (gapCount === 0) {
    return null;
  }

  return `${gapCount} line${gapCount === 1 ? "" : "s"} ${gapCount === 1 ? "is" : "are"} missing grower or batch identity. Confirm the exact lot before sending.`;
}

export function buildCatalogueOutboundNotes(
  items: CatalogueOutboundIdentityItem[]
) {
  return [
    buildCatalogueIdentityWarning(items),
    buildCatalogueConfirmationNote(),
  ].filter((note): note is string => Boolean(note));
}
