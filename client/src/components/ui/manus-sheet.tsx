/**
 * ManusSheet — UX v2 enforced drawer primitive (TER-1294)
 *
 * Wraps the existing Radix-based Sheet (`@/components/ui/sheet`) with a fixed
 * set of affordances that the "Manus" UX v2 language mandates on every drawer
 * surface:
 *
 *   1. Visible close-X button in the top-right corner (always rendered).
 *   2. "Esc to close" hint rendered inside the drawer footer by default.
 *   3. Focus return to the triggering element on close, via `useReturnFocus`.
 *      Works for both explicit `triggerRef` call sites AND the legacy
 *      ref-less `<SheetTrigger>` call sites flagged in QA report §8.
 *   4. Canonical `size` prop: "sm" | "md" | "lg" → 400 / 640 / 800px wide.
 *   5. `onOpenChange` is driven by close-X click, Esc key, and backdrop click
 *      (all provided by Radix Dialog's `onOpenChange` semantics).
 *
 * The existing `Sheet`, `SheetContent`, etc. exports from `@/components/ui/sheet`
 * are NOT modified — this is a new, additive primitive. Gate consumption on the
 * `ux.v2.drawer` feature flag (see `@/components/feature-flags/uxV2Flags`).
 *
 * @example
 * ```tsx
 * import {
 *   ManusSheet,
 *   ManusSheetContent,
 *   ManusSheetHeader,
 *   ManusSheetTitle,
 *   ManusSheetFooter,
 * } from "@/components/ui/manus-sheet";
 * import { SheetTrigger } from "@/components/ui/sheet";
 *
 * function Example() {
 *   const [open, setOpen] = useState(false);
 *   return (
 *     <ManusSheet open={open} onOpenChange={setOpen}>
 *       <SheetTrigger asChild>
 *         <Button>Open</Button>
 *       </SheetTrigger>
 *       <ManusSheetContent size="md">
 *         <ManusSheetHeader>
 *           <ManusSheetTitle>Edit item</ManusSheetTitle>
 *         </ManusSheetHeader>
 *         <div className="px-4">{/* body ... *\/}</div>
 *         <ManusSheetFooter>
 *           <Button onClick={() => setOpen(false)}>Save</Button>
 *         </ManusSheetFooter>
 *       </ManusSheetContent>
 *     </ManusSheet>
 *   );
 * }
 * ```
 */

"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { useReturnFocus } from "@/hooks/useReturnFocus";

/**
 * Canonical ManusSheet widths.
 * These match the UX v2 spec (docs/ux-review/02-Implementation_Strategy.md §4.4).
 */
export type ManusSheetSize = "sm" | "md" | "lg";

const SIZE_CLASSNAMES: Record<ManusSheetSize, string> = {
  sm: "w-full sm:max-w-[400px]",
  md: "w-full sm:max-w-[640px]",
  lg: "w-full sm:max-w-[800px]",
};

const SIZE_PIXELS: Record<ManusSheetSize, number> = {
  sm: 400,
  md: 640,
  lg: 800,
};

/** Exposed for testing / downstream telemetry. */
export function getManusSheetWidthPx(size: ManusSheetSize): number {
  return SIZE_PIXELS[size];
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

/**
 * ManusSheet root. Thin pass-through around the existing `Sheet` (Radix Dialog
 * Root) so that `onOpenChange`, `open`, `defaultOpen`, and `modal` props
 * continue to behave exactly as they do on the stock primitive.
 */
function ManusSheet(
  props: React.ComponentProps<typeof Sheet>
): React.ReactElement {
  return <Sheet data-slot="manus-sheet" {...props} />;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export interface ManusSheetContentProps
  extends Omit<
    React.ComponentProps<typeof SheetPrimitive.Content>,
    "children"
  > {
  /** Side the drawer slides in from. Defaults to "right". */
  side?: "right" | "left";
  /** Canonical width. Defaults to "md" (640px). */
  size?: ManusSheetSize;
  /**
   * Optional ref to the triggering element. If omitted, focus is returned to
   * whatever element was focused at the moment the drawer opened (legacy
   * ref-less trigger support).
   */
  triggerRef?: React.RefObject<HTMLElement | null>;
  /** Label for the enforced close-X button. Defaults to "Close". */
  closeLabel?: string;
  children?: React.ReactNode;
}

function ManusSheetContent({
  side = "right",
  size = "md",
  triggerRef,
  closeLabel = "Close",
  className,
  children,
  ...props
}: ManusSheetContentProps): React.ReactElement {
  // Return focus to trigger on close (works for ref'd and ref-less triggers).
  useReturnFocus({ triggerRef });

  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="manus-sheet-overlay"
        className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
      />
      <SheetPrimitive.Content
        data-slot="manus-sheet-content"
        data-size={size}
        data-side={side}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-0 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full border-l",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full border-r",
          SIZE_CLASSNAMES[size],
          className
        )}
        {...props}
      >
        {children}
        {/*
         * TER-1366: Enforced "Esc to close" hint.
         *
         * Previously the hint was only rendered when consumers opted into
         * `ManusSheetFooter` (its `showEscHint` prop). That left drawers
         * without an explicit footer silently missing the affordance, which
         * violated the UX v2 drawer contract. Rendering it directly in
         * `ManusSheetContent` — below `{children}` — guarantees every drawer
         * surface shows the hint regardless of whether a footer is used.
         */}
        <div
          data-slot="manus-sheet-esc-hint"
          className="text-muted-foreground flex items-center gap-1 border-t px-4 py-2 text-xs"
        >
          <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono text-xs">
            Esc
          </kbd>
          <span>to close</span>
        </div>
        {/*
         * Enforced close-X affordance.
         * Always rendered; cannot be opted out. Clicking this triggers
         * Radix's onOpenChange(false) via the Dialog.Close primitive, which
         * mirrors Esc and backdrop-click behavior.
         */}
        <SheetPrimitive.Close
          aria-label={closeLabel}
          data-slot="manus-sheet-close"
          className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
        >
          <XIcon className="size-4" aria-hidden="true" />
          <span className="sr-only">{closeLabel}</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

// ---------------------------------------------------------------------------
// Header / Title / Description
// ---------------------------------------------------------------------------

function ManusSheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="manus-sheet-header"
      // `pr-10` reserves horizontal space so the enforced close-X does not
      // overlap header content (icon is ~16px at top-right + padding).
      className={cn("flex flex-col gap-1.5 border-b p-4 pr-10", className)}
      {...props}
    />
  );
}

function ManusSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>): React.ReactElement {
  return (
    <SheetPrimitive.Title
      data-slot="manus-sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function ManusSheetDescription({
  className,
  ...props
}: React.ComponentProps<
  typeof SheetPrimitive.Description
>): React.ReactElement {
  return (
    <SheetPrimitive.Description
      data-slot="manus-sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

export interface ManusSheetFooterProps extends React.ComponentProps<"div"> {
  /**
   * @deprecated TER-1366: The "Esc to close" hint is now rendered directly
   * inside {@link ManusSheetContent} so that every drawer surface shows it
   * regardless of whether a footer is used. This prop is preserved only
   * for back-compat and has no effect.
   */
  showEscHint?: boolean;
}

function ManusSheetFooter({
  className,
  children,
  // TER-1366: `showEscHint` is intentionally destructured (but unused) so
  // that existing call sites compile without warnings. The hint itself now
  // lives in `ManusSheetContent`.
  showEscHint: _showEscHint,
  ...props
}: ManusSheetFooterProps): React.ReactElement {
  void _showEscHint;
  return (
    <div
      data-slot="manus-sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 border-t p-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Close convenience
// ---------------------------------------------------------------------------

function ManusSheetClose(
  props: React.ComponentProps<typeof SheetPrimitive.Close>
): React.ReactElement {
  return <SheetPrimitive.Close data-slot="manus-sheet-close-action" {...props} />;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  ManusSheet,
  ManusSheetContent,
  ManusSheetHeader,
  ManusSheetTitle,
  ManusSheetDescription,
  ManusSheetFooter,
  ManusSheetClose,
};
