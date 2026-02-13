/**
 * InlinePriceEditor (UXS-601)
 *
 * Inline popover replacement for PriceAdjustmentDialog.
 * Allows price adjustments directly on line items without opening a modal.
 *
 * Benefits over modal:
 * - Line item context preserved
 * - Quick adjustments without workflow interruption
 * - Margin calculation visible in context
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// Types
// ============================================================================

type AdjustmentType = 'AMOUNT' | 'PERCENT';

interface InlinePriceEditorProps {
  /** Current price */
  currentPrice: number;
  /** Cost for margin calculation */
  cost?: number;
  /** Product/item name for display */
  itemName: string;
  /** Callback when price is adjusted */
  onAdjust: (newPrice: number, reason: string) => void | Promise<void>;
  /** Whether adjustment is in progress */
  isAdjusting?: boolean;
  /** Custom trigger element */
  children?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

// ============================================================================
// Main Component
// ============================================================================

export function InlinePriceEditor({
  currentPrice,
  cost,
  itemName,
  onAdjust,
  isAdjusting = false,
  children,
  disabled = false,
}: InlinePriceEditorProps) {
  const [open, setOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('AMOUNT');
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [direction, setDirection] = useState<'increase' | 'decrease'>('decrease');
  const [reason, setReason] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setAdjustmentType('AMOUNT');
      setAdjustmentValue('');
      setDirection('decrease');
      setReason('');
    }
  }, [open]);

  // Calculate new price
  const calculateNewPrice = useCallback((): number => {
    const value = parseFloat(adjustmentValue) || 0;
    if (value === 0) return currentPrice;

    if (adjustmentType === 'AMOUNT') {
      return direction === 'increase'
        ? currentPrice + value
        : currentPrice - value;
    } else {
      const change = currentPrice * (value / 100);
      return direction === 'increase'
        ? currentPrice + change
        : currentPrice - change;
    }
  }, [currentPrice, adjustmentType, adjustmentValue, direction]);

  const newPrice = calculateNewPrice();
  const priceChange = newPrice - currentPrice;
  const changePercent = currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;

  // Calculate margins
  const currentMargin = cost && cost > 0 ? ((currentPrice - cost) / currentPrice) * 100 : null;
  const newMargin = cost && cost > 0 && newPrice > 0 ? ((newPrice - cost) / newPrice) * 100 : null;

  // Handlers
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error('Please provide a reason for the price adjustment');
      return;
    }

    if (newPrice <= 0) {
      toast.error('Price must be greater than zero');
      return;
    }

    if (newPrice === currentPrice) {
      toast.error('No price change specified');
      return;
    }

    try {
      await onAdjust(newPrice, reason.trim());
      setOpen(false);
      toast.success(`Price adjusted to ${formatCurrency(newPrice)}`);
    } catch (_error) {
      // Error handling is done by parent
    }
  }, [newPrice, currentPrice, reason, onAdjust]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  }, [handleSubmit]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children || (
          <Button variant="ghost" size="sm" className="h-auto p-1 font-mono">
            {formatCurrency(currentPrice)}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        align="start"
        onKeyDown={handleKeyDown}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <h4 className="font-medium leading-none">Adjust Price</h4>
            <p className="text-sm text-muted-foreground truncate">{itemName}</p>
          </div>

          {/* Current Price */}
          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Current Price</span>
            <span className="font-mono font-semibold">{formatCurrency(currentPrice)}</span>
          </div>

          {/* Adjustment Controls */}
          <div className="space-y-3">
            {/* Type & Direction */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={adjustmentType}
                  onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMOUNT">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3" />
                        Amount
                      </div>
                    </SelectItem>
                    <SelectItem value="PERCENT">
                      <div className="flex items-center gap-2">
                        <Percent className="w-3 h-3" />
                        Percent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Direction</Label>
                <Select
                  value={direction}
                  onValueChange={(v) => setDirection(v as 'increase' | 'decrease')}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="decrease">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-3 h-3 text-green-600" />
                        Decrease
                      </div>
                    </SelectItem>
                    <SelectItem value="increase">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-red-600" />
                        Increase
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Value Input */}
            <div className="space-y-1">
              <Label className="text-xs">Adjustment Value</Label>
              <div className="relative">
                {adjustmentType === 'AMOUNT' ? (
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                ) : (
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  ref={inputRef}
                  type="number"
                  step={adjustmentType === 'AMOUNT' ? '0.01' : '0.1'}
                  min="0"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  className="pl-9 h-9"
                  placeholder={adjustmentType === 'AMOUNT' ? '0.00' : '0'}
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <Label className="text-xs">Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Required: Why is this being adjusted?"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>

          {/* Preview */}
          {parseFloat(adjustmentValue) > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Price</span>
                <span className={cn(
                  'font-mono font-bold text-lg',
                  newPrice < currentPrice && 'text-green-600',
                  newPrice > currentPrice && 'text-red-600'
                )}>
                  {formatCurrency(newPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Change</span>
                <Badge variant="outline" className={cn(
                  priceChange < 0 && 'bg-green-50 text-green-700 border-green-200',
                  priceChange > 0 && 'bg-red-50 text-red-700 border-red-200'
                )}>
                  {priceChange > 0 ? '+' : ''}{formatCurrency(priceChange)} ({changePercent.toFixed(1)}%)
                </Badge>
              </div>
              {currentMargin !== null && newMargin !== null && (
                <div className="flex items-center justify-between text-xs pt-2 border-t">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calculator className="w-3 h-3" />
                    Margin
                  </span>
                  <span className={cn(
                    newMargin < currentMargin && 'text-amber-600',
                    newMargin > currentMargin && 'text-green-600'
                  )}>
                    {formatPercent(currentMargin)} → {formatPercent(newMargin)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={isAdjusting}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="flex-1"
              disabled={isAdjusting || !reason.trim() || parseFloat(adjustmentValue) <= 0}
            >
              <Check className="w-4 h-4 mr-1" />
              {isAdjusting ? 'Saving...' : 'Apply'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Cmd+Enter to apply, Esc to cancel
          </p>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export default InlinePriceEditor;
