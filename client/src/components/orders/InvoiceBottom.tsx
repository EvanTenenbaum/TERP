import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  PAYMENT_TERMS_OPTIONS,
  type OrderAdjustment,
  type PaymentTerms,
} from "./types";

interface InvoiceBottomProps {
  subtotal: number;
  adjustment: OrderAdjustment | null;
  onAdjustmentChange: (adjustment: OrderAdjustment | null) => void;
  showAdjustmentOnDocument: boolean;
  onShowAdjustmentOnDocumentChange: (show: boolean) => void;
  freight: number;
  onFreightChange: (freight: number) => void;
  total: number;
  paymentTerms: PaymentTerms;
  onPaymentTermsChange: (terms: PaymentTerms) => void;
  onSaveTermsAsDefault?: () => void;
  creditAvailable: number | null;
  creditUtilizationPercent: number | null;
  creditWarning: string | null;
  onOpenCredit?: () => void;
  totalCogs?: number;
  totalMargin?: number;
  marginPercent?: number;
  showCogs?: boolean;
  showMargin?: boolean;
}

const currency = (value: number) => `$${value.toFixed(2)}`;

export function InvoiceBottom({
  subtotal,
  adjustment,
  onAdjustmentChange,
  showAdjustmentOnDocument,
  onShowAdjustmentOnDocumentChange,
  freight,
  onFreightChange,
  total,
  paymentTerms,
  onPaymentTermsChange,
  onSaveTermsAsDefault,
  creditAvailable,
  creditUtilizationPercent,
  creditWarning,
  onOpenCredit,
  totalCogs,
  totalMargin,
  marginPercent,
  showCogs = false,
  showMargin = false,
}: InvoiceBottomProps) {
  const [adjustmentMode, setAdjustmentMode] = useState<"DISCOUNT" | "MARKUP">(
    adjustment?.mode ?? "DISCOUNT"
  );
  const [adjustmentType, setAdjustmentType] = useState<"PERCENT" | "DOLLAR">(
    adjustment?.type ?? "DOLLAR"
  );
  const [adjustmentAmount, setAdjustmentAmount] = useState(
    adjustment ? String(adjustment.amount) : ""
  );
  const [freightValue, setFreightValue] = useState(String(freight));
  const isEditingAdjustmentRef = useRef(false);

  useEffect(() => {
    if (adjustment === null) {
      setAdjustmentMode("DISCOUNT");
      setAdjustmentType("DOLLAR");
      setAdjustmentAmount("");
      return;
    }

    if (isEditingAdjustmentRef.current) {
      return;
    }
    setAdjustmentMode(adjustment.mode);
    setAdjustmentType(adjustment.type);
    setAdjustmentAmount(String(adjustment.amount));
  }, [adjustment]);

  useEffect(() => {
    setFreightValue(String(freight));
  }, [freight]);

  const parsedAdjustmentAmount = Number.parseFloat(adjustmentAmount);
  const hasAdjustment =
    Number.isFinite(parsedAdjustmentAmount) && parsedAdjustmentAmount > 0;
  const adjustmentDisplayAmount = adjustment
    ? adjustment.type === "PERCENT"
      ? (subtotal * adjustment.amount) / 100
      : adjustment.amount
    : 0;

  const commitAdjustment = () => {
    if (!hasAdjustment) {
      onAdjustmentChange(null);
      return;
    }

    onAdjustmentChange({
      amount: parsedAdjustmentAmount,
      mode: adjustmentMode,
      type: adjustmentType,
    });
  };

  return (
    <section className="border-t border-border/70 bg-muted/20 px-4 py-3">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
            <div className="space-y-1">
              <Label htmlFor="invoice-adjustment-amount">
                Whole Order Change
              </Label>
              <div className="flex gap-2">
                <Input
                  id="invoice-adjustment-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={adjustmentAmount}
                  onChange={event => setAdjustmentAmount(event.target.value)}
                  onFocus={() => {
                    isEditingAdjustmentRef.current = true;
                  }}
                  onBlur={() => {
                    isEditingAdjustmentRef.current = false;
                    commitAdjustment();
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAdjustmentAmount("");
                    onAdjustmentChange(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Mode</Label>
              <Select
                value={adjustmentMode}
                onValueChange={value => {
                  const nextValue = value as "DISCOUNT" | "MARKUP";
                  setAdjustmentMode(nextValue);
                  if (hasAdjustment) {
                    onAdjustmentChange({
                      amount: parsedAdjustmentAmount,
                      mode: nextValue,
                      type: adjustmentType,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISCOUNT">Discount</SelectItem>
                  <SelectItem value="MARKUP">Markup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Unit</Label>
              <Select
                value={adjustmentType}
                onValueChange={value => {
                  const nextValue = value as "PERCENT" | "DOLLAR";
                  setAdjustmentType(nextValue);
                  if (hasAdjustment) {
                    onAdjustmentChange({
                      amount: parsedAdjustmentAmount,
                      mode: adjustmentMode,
                      type: nextValue,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOLLAR">Dollar</SelectItem>
                  <SelectItem value="PERCENT">Percent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div className="space-y-1">
              <Label htmlFor="invoice-payment-terms">Payment Terms</Label>
              <div className="flex gap-2">
                <Select
                  value={paymentTerms}
                  onValueChange={value =>
                    onPaymentTermsChange(value as PaymentTerms)
                  }
                >
                  <SelectTrigger
                    id="invoice-payment-terms"
                    aria-label="Payment Terms"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>
                        {option.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSaveTermsAsDefault}
                  disabled={!onSaveTermsAsDefault}
                >
                  Save Default
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="invoice-freight">Freight</Label>
              <Input
                id="invoice-freight"
                inputMode="decimal"
                value={freightValue}
                onChange={event => setFreightValue(event.target.value)}
                onBlur={() =>
                  onFreightChange(Number.parseFloat(freightValue) || 0)
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2">
            <div>
              <p className="text-sm font-medium">Show on client document</p>
              <p className="text-xs text-muted-foreground">
                Keep discount or markup visible on the finished order.
              </p>
            </div>
            <Switch
              checked={showAdjustmentOnDocument}
              onCheckedChange={onShowAdjustmentOnDocumentChange}
              aria-label="Show adjustment on document"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border/70 bg-background p-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{currency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Whole order change</span>
              <span className="font-medium">
                {adjustment
                  ? `${adjustment.mode === "DISCOUNT" ? "-" : "+"}${currency(adjustmentDisplayAmount)}`
                  : "$0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Freight</span>
              <span className="font-medium">{currency(freight)}</span>
            </div>
            {showCogs && typeof totalCogs === "number" ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">COGS</span>
                <span className="font-medium">{currency(totalCogs)}</span>
              </div>
            ) : null}
            {showMargin && typeof totalMargin === "number" ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Margin</span>
                <span className="font-medium">
                  {currency(totalMargin)}
                  {typeof marginPercent === "number"
                    ? ` (${marginPercent.toFixed(1)}%)`
                    : ""}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-border/70 pt-3">
            <span className="text-base font-semibold">Total</span>
            <span className="text-xl font-bold">{currency(total)}</span>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Credit</p>
                <p className="text-xs text-muted-foreground">
                  {creditAvailable === null
                    ? "Credit visibility unavailable"
                    : `${currency(creditAvailable)} available`}
                </p>
              </div>
              {typeof creditUtilizationPercent === "number" ? (
                <Badge variant="secondary">
                  {creditUtilizationPercent.toFixed(0)}% utilized
                </Badge>
              ) : null}
            </div>
            {creditWarning ? (
              <p className="mt-2 text-xs text-amber-700">{creditWarning}</p>
            ) : null}
            {onOpenCredit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={onOpenCredit}
              >
                Open Credit
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
