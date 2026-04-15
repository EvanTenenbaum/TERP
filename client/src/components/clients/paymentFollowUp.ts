export type PaymentCommunicationType = "CALL" | "EMAIL" | "MEETING" | "NOTE";

export type RelationshipMoneyMode = "customer" | "supplier" | "hybrid" | "neutral";

export type PaymentFollowUpContext = {
  mode: RelationshipMoneyMode;
  receivableAmount?: number;
  payableAmount?: number;
  openPayableCount?: number;
  netPosition?: number;
};

export const PAYMENT_FOLLOW_UP_SUBJECT_PREFIX = "Payment follow-up";

export const formatPaymentFollowUpMoney = (
  value: number | null | undefined
) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

export function buildPaymentFollowUpSubject(
  type: PaymentCommunicationType
): string {
  const label =
    type === "CALL"
      ? "call"
      : type === "EMAIL"
        ? "email"
        : type === "MEETING"
          ? "meeting"
          : "note";

  return `${PAYMENT_FOLLOW_UP_SUBJECT_PREFIX}: ${label}`;
}

export function isPaymentFollowUpCommunication(
  subject: string | null | undefined
): boolean {
  return (subject ?? "")
    .trim()
    .toLowerCase()
    .startsWith(PAYMENT_FOLLOW_UP_SUBJECT_PREFIX.toLowerCase());
}

export function buildPaymentFollowUpNotes(
  context: PaymentFollowUpContext
): string {
  const lines: string[] = [];

  if (context.mode === "supplier") {
    lines.push(
      `Payable due: ${formatPaymentFollowUpMoney(context.payableAmount)}`
    );
    lines.push(`Open payables: ${context.openPayableCount ?? 0}`);
  } else if (context.mode === "hybrid") {
    lines.push(
      `Receivable: ${formatPaymentFollowUpMoney(context.receivableAmount)}`
    );
    lines.push(
      `Payable due: ${formatPaymentFollowUpMoney(context.payableAmount)}`
    );
    lines.push(
      `Net position: ${formatPaymentFollowUpMoney(context.netPosition)}`
    );
  } else {
    lines.push(
      `Receivable: ${formatPaymentFollowUpMoney(context.receivableAmount)}`
    );
  }

  lines.push("");
  lines.push("Follow-up outcome:");
  lines.push("Next step:");

  return lines.join("\n");
}
