import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CalendarClock, FileText, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import {
  buildPaymentFollowUpSubject,
  formatPaymentFollowUpMoney,
  isPaymentFollowUpCommunication,
  type PaymentCommunicationType,
  type PaymentFollowUpContext,
} from "./paymentFollowUp";

interface PaymentFollowUpPanelProps {
  clientId: number;
  context: PaymentFollowUpContext;
  onLogFollowUp: (type: PaymentCommunicationType) => void;
}

const getContextSummary = (context: PaymentFollowUpContext): string => {
  if (context.mode === "supplier") {
    return `${formatPaymentFollowUpMoney(context.payableAmount)} due across ${context.openPayableCount ?? 0} open payables.`;
  }

  if (context.mode === "hybrid") {
    return `${formatPaymentFollowUpMoney(context.receivableAmount)} receivable and ${formatPaymentFollowUpMoney(context.payableAmount)} payable due.`;
  }

  return `${formatPaymentFollowUpMoney(context.receivableAmount)} outstanding receivable to track.`;
};

const getEntryIcon = (type: PaymentCommunicationType) => {
  switch (type) {
    case "CALL":
      return <Phone className="h-4 w-4" />;
    case "EMAIL":
      return <Mail className="h-4 w-4" />;
    case "MEETING":
      return <CalendarClock className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

export function PaymentFollowUpPanel({
  clientId,
  context,
  onLogFollowUp,
}: PaymentFollowUpPanelProps) {
  const { data, isLoading } = trpc.clients.communications.list.useQuery({
    clientId,
  });

  const followUps =
    data
      ?.filter(entry => isPaymentFollowUpCommunication(entry.subject))
      .sort((left, right) => {
        const leftTime = left.communicatedAt
          ? new Date(left.communicatedAt).getTime()
          : 0;
        const rightTime = right.communicatedAt
          ? new Date(right.communicatedAt).getTime()
          : 0;
        return rightTime - leftTime;
      }) ?? [];
  const latestFollowUp = followUps[0] ?? null;

  return (
    <Card data-testid="payment-follow-up-panel">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Payment Follow-up</CardTitle>
              <Badge variant="outline" data-testid="payment-follow-up-status">
                {latestFollowUp ? "Tracking active" : "No follow-up logged"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Keep collection and settlement outreach tied to the money context
              above. {getContextSummary(context)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onLogFollowUp("CALL")}
            >
              <Phone className="mr-2 h-4 w-4" />
              Log Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onLogFollowUp("EMAIL")}
            >
              <Mail className="mr-2 h-4 w-4" />
              Log Email
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onLogFollowUp("NOTE")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading payment follow-up history...
          </p>
        ) : followUps.length ? (
          <div className="space-y-3">
            {followUps.slice(0, 4).map(entry => (
              <div
                key={entry.id}
                className="rounded-xl border border-border/70 bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {getEntryIcon(entry.communicationType)}
                      <span>{entry.subject || buildPaymentFollowUpSubject("NOTE")}</span>
                    </div>
                    {entry.notes ? (
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {entry.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>
                      {entry.communicatedAt
                        ? format(
                            new Date(entry.communicatedAt),
                            "MMM d, yyyy h:mm a"
                          )
                        : "N/A"}
                    </p>
                    <p>{entry.loggedByName || "Unknown"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            No payment follow-up has been logged yet. Use the quick actions above
            to keep payment outreach attached to this relationship.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
