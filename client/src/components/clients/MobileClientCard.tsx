/**
 * MobileClientCard Component
 * BUG-M003: Mobile-friendly card view for clients list
 *
 * Displays client information in a card format optimized for mobile devices.
 * Shows primary info (name, TERI code) prominently with secondary details below.
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, AlertTriangle, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreditIndicatorDot } from "@/components/credit/CreditIndicator";

interface ClientType {
  id: number;
  teriCode: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  isBuyer: boolean | null;
  isSeller: boolean | null;
  totalSpent?: string | number | null;
  totalOwed?: string | number | null;
  oldestDebtDays?: number | null;
  creditLimit?: string | number | null;
}

interface MobileClientCardProps {
  client: ClientType;
  onClick?: () => void;
  isSelected?: boolean;
}

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export const MobileClientCard = React.memo(function MobileClientCard({
  client,
  onClick,
  isSelected = false,
}: MobileClientCardProps) {
  const hasDebt = client.totalOwed && parseFloat(String(client.totalOwed)) > 0;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors cursor-pointer",
        "hover:bg-accent/50 active:bg-accent",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Primary row: Name and chevron */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Client name - primary info */}
            <h3 className="font-semibold text-base truncate">
              {client.name || "Unnamed Client"}
            </h3>
            {/* TERI Code */}
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.teriCode}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
        </div>

        {/* Client type badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {client.isBuyer && (
            <Badge variant="default" className="text-xs">
              Buyer
            </Badge>
          )}
          {client.isSeller && (
            <Badge variant="secondary" className="text-xs">
              Supplier
            </Badge>
          )}
        </div>

        {/* Contact info */}
        {(client.email || client.phone) && (
          <div className="mt-3 space-y-1.5">
            {client.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Financial summary */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Spent</span>
            <span className="font-medium">
              {formatCurrency(client.totalSpent)}
            </span>
          </div>
          {hasDebt && (
            <div className="flex items-center justify-between text-sm mt-1.5">
              <span className="text-muted-foreground">Amount Owed</span>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="font-medium text-destructive">
                  {formatCurrency(client.totalOwed)}
                </span>
              </div>
            </div>
          )}
          {/* Credit indicator for buyers */}
          {client.isBuyer && (
            <div className="flex items-center justify-between text-sm mt-1.5">
              <span className="text-muted-foreground">Credit Status</span>
              <div className="flex items-center gap-1.5">
                <CreditIndicatorDot
                  creditLimit={client.creditLimit}
                  totalOwed={client.totalOwed}
                />
                {Number(client.creditLimit || 0) > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(
                      (Number(client.totalOwed || 0) /
                        Number(client.creditLimit || 1)) *
                        100
                    )}
                    %
                  </span>
                )}
              </div>
            </div>
          )}
          {client.oldestDebtDays && client.oldestDebtDays > 0 && (
            <div className="flex items-center justify-between text-sm mt-1.5">
              <span className="text-muted-foreground">Oldest Debt</span>
              <span className="font-medium text-destructive">
                {client.oldestDebtDays} days
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default MobileClientCard;
