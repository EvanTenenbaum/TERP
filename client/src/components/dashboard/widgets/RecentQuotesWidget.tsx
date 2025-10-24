import { WidgetContainer } from "../WidgetContainer";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface Quote {
  id: string;
  customer: string;
  amount: number;
  status: "draft" | "sent" | "accepted" | "rejected";
}

// Mock data - in production, this would come from tRPC
const mockQuotes: Quote[] = [
  { id: "Q-2024-003", customer: "Global Enterprises", amount: 42300, status: "sent" },
  { id: "Q-2024-002", customer: "Tech Solutions Inc.", amount: 28900, status: "accepted" },
  { id: "Q-2024-001", customer: "Acme Corporation", amount: 15750, status: "draft" },
];

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function RecentQuotesWidget() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <WidgetContainer title="Recent Quotes">
      <div className="space-y-3">
        {mockQuotes.map((quote) => (
          <div
            key={quote.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{quote.id}</p>
                <p className="text-xs text-muted-foreground">{quote.customer}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm">{formatCurrency(quote.amount)}</p>
              <Badge variant="secondary" className={`text-xs ${statusColors[quote.status]}`}>
                {quote.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </WidgetContainer>
  );
}

