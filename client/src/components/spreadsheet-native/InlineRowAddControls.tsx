import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface InlineRowAddControlsProps {
  addLabel?: string;
  addedLabel?: string;
  added: boolean;
  disabled?: boolean;
  onAdd: () => void;
  quantityValue: string;
  quantityLabel: string;
  onQuantityChange: (value: string) => void;
  onQuantityBlur?: () => void;
  quantityPlaceholder?: string;
  quantityInputMode?: "numeric" | "decimal";
  priceValue?: string;
  priceLabel?: string;
  onPriceChange?: (value: string) => void;
  onPriceBlur?: () => void;
  pricePlaceholder?: string;
  markupValue?: string;
  markupLabel?: string;
  onMarkupChange?: (value: string) => void;
  onMarkupBlur?: () => void;
  markupPlaceholder?: string;
}

type StopGridEvent = {
  stopPropagation: () => void;
};

const stopGridEvent = (event: StopGridEvent) => {
  event.stopPropagation();
};

export function InlineRowAddControls({
  addLabel = "+ Add",
  addedLabel = "Added",
  added,
  disabled = false,
  onAdd,
  quantityValue,
  quantityLabel,
  onQuantityChange,
  onQuantityBlur,
  quantityPlaceholder = "Qty",
  quantityInputMode = "numeric",
  priceValue,
  priceLabel,
  onPriceChange,
  onPriceBlur,
  pricePlaceholder = "Price",
  markupValue,
  markupLabel,
  onMarkupChange,
  onMarkupBlur,
  markupPlaceholder = "% Mk",
}: InlineRowAddControlsProps) {
  const isInputDisabled = added || disabled;

  return (
    <div className="flex items-center gap-1 py-1">
      <Button
        type="button"
        size="sm"
        variant={added ? "secondary" : "outline"}
        className="h-6 px-2 text-[10px]"
        disabled={isInputDisabled}
        onMouseDown={stopGridEvent}
        onClick={event => {
          stopGridEvent(event);
          onAdd();
        }}
      >
        {added ? addedLabel : addLabel}
      </Button>
      <Input
        value={quantityValue}
        aria-label={quantityLabel}
        placeholder={quantityPlaceholder}
        className="h-6 w-14 px-1.5 text-[10px]"
        inputMode={quantityInputMode}
        disabled={isInputDisabled}
        onMouseDown={stopGridEvent}
        onClick={stopGridEvent}
        onKeyDown={stopGridEvent}
        onChange={event => {
          stopGridEvent(event);
          onQuantityChange(event.target.value);
        }}
        onBlur={event => {
          stopGridEvent(event);
          onQuantityBlur?.();
        }}
      />
      {onPriceChange ? (
        <Input
          value={priceValue ?? ""}
          aria-label={priceLabel}
          placeholder={pricePlaceholder}
          className="h-6 w-[4.5rem] px-1.5 text-[10px]"
          inputMode="decimal"
          disabled={isInputDisabled}
          onMouseDown={stopGridEvent}
          onClick={stopGridEvent}
          onKeyDown={stopGridEvent}
          onChange={event => {
            stopGridEvent(event);
            onPriceChange(event.target.value);
          }}
          onBlur={event => {
            stopGridEvent(event);
            onPriceBlur?.();
          }}
        />
      ) : null}
      {onMarkupChange ? (
        <Input
          value={markupValue ?? ""}
          aria-label={markupLabel}
          placeholder={markupPlaceholder}
          className="h-6 w-16 px-1.5 text-[10px]"
          inputMode="decimal"
          disabled={isInputDisabled}
          onMouseDown={stopGridEvent}
          onClick={stopGridEvent}
          onKeyDown={stopGridEvent}
          onChange={event => {
            stopGridEvent(event);
            onMarkupChange(event.target.value);
          }}
          onBlur={event => {
            stopGridEvent(event);
            onMarkupBlur?.();
          }}
        />
      ) : null}
    </div>
  );
}

export default InlineRowAddControls;
