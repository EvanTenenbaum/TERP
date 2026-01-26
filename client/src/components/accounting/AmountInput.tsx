import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AmountInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "onChange" | "value"
> {
  value?: number | string;
  onChange?: (value: number) => void;
  currency?: string;
  allowNegative?: boolean;
}

/**
 * AmountInput - Currency input component with automatic formatting
 *
 * Features:
 * - Formats numbers as currency (e.g., 1234.56 → $1,234.56)
 * - Handles decimal precision (2 decimal places)
 * - Optional negative values
 * - Validates numeric input
 */
export function AmountInput({
  value = 0,
  onChange,
  currency = "$",
  allowNegative = false,
  className,
  ...props
}: AmountInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>("");
  const [isFocused, setIsFocused] = React.useState(false);

  // LINT-001: Use useCallback to memoize formatCurrency for exhaustive-deps compliance
  // Format number to currency display
  const formatCurrency = React.useCallback(
    (num: number): string => {
      const absNum = Math.abs(num);
      const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(absNum);

      const sign = num < 0 ? "-" : "";
      return `${sign}${currency}${formatted}`;
    },
    [currency]
  );

  // Parse currency string to number
  const parseCurrency = (str: string): number => {
    // Remove currency symbol, commas, and spaces
    const cleaned = str.replace(/[$,\s]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Update display value when prop value changes
  React.useEffect(() => {
    if (!isFocused) {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      setDisplayValue(formatCurrency(numValue || 0));
    }
  }, [value, isFocused, formatCurrency]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Show raw number when focused (easier to edit)
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    setDisplayValue((numValue || 0).toFixed(2));
    e.target.select(); // Select all text for easy replacement
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const numValue = parseCurrency(e.target.value);

    // Validate negative values
    const finalValue = !allowNegative && numValue < 0 ? 0 : numValue;

    setDisplayValue(formatCurrency(finalValue));
    onChange?.(finalValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow only numbers, decimal point, and optional negative sign
    const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;

    if (regex.test(inputValue) || inputValue === "" || inputValue === "-") {
      setDisplayValue(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "Escape" ||
      e.key === "Enter" ||
      e.key === "." ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End" ||
      (allowNegative && e.key === "-")
    ) {
      return;
    }

    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (e.ctrlKey || e.metaKey) {
      return;
    }

    // Prevent non-numeric input
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn("text-right font-mono", className)}
      {...props}
    />
  );
}
