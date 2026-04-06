export interface RelationshipSummaryInput {
  isBuyer?: boolean | null;
  isSeller?: boolean | null;
  isBrand?: boolean | null;
}

export function getRelationshipSummary({
  isBuyer,
  isSeller,
  isBrand,
}: RelationshipSummaryInput): string {
  const labels: string[] = [];

  if (isBuyer && isSeller) {
    labels.push("Both");
  } else if (isBuyer) {
    labels.push("Buyer");
  } else if (isSeller) {
    labels.push("Seller");
  }

  if (isBrand) {
    labels.push("Brand");
  }

  if (labels.length === 0) {
    return "Unclassified";
  }

  return labels.join(" • ");
}
