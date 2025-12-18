/**
 * FormSubmitButton - Submit button with loading state and double-submit prevention
 * ARCH-002: Loading state binding and double-submit risk elimination
 *
 * This component:
 * - Shows loading spinner when mutation is pending
 * - Disables automatically during form submission
 * - Prevents double-clicks
 * - Provides visual feedback for all states
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "./button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

export interface FormSubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Whether the form/mutation is currently submitting */
  isSubmitting?: boolean;
  /** Alternative name for isSubmitting (for tRPC compatibility) */
  isPending?: boolean;
  /** Text to show while submitting */
  loadingText?: string;
  /** Whether to use the Slot component for composition */
  asChild?: boolean;
  /** Icon to show on the left (hidden during loading) */
  icon?: React.ReactNode;
}

/**
 * A button specifically designed for form submissions with built-in
 * loading states and double-submit prevention.
 *
 * @example
 * ```tsx
 * // With useAppMutation
 * const { mutate, isPending } = useAppMutation(trpc.clients.create);
 *
 * <FormSubmitButton
 *   isPending={isPending}
 *   loadingText="Creating..."
 * >
 *   Create Client
 * </FormSubmitButton>
 * ```
 *
 * @example
 * ```tsx
 * // With react-hook-form
 * const { formState: { isSubmitting } } = useForm();
 *
 * <FormSubmitButton isSubmitting={isSubmitting}>
 *   Save Changes
 * </FormSubmitButton>
 * ```
 */
const FormSubmitButton = React.memo(function FormSubmitButton({
  children,
  className,
  disabled,
  isSubmitting = false,
  isPending = false,
  loadingText,
  variant = "default",
  size = "default",
  icon,
  type = "submit",
  ...props
}: FormSubmitButtonProps) {
  // Support both isSubmitting and isPending for flexibility
  const isLoading = isSubmitting || isPending;

  // Track click to prevent double-clicks
  const lastClickRef = React.useRef<number>(0);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent rapid double-clicks (within 500ms)
      const now = Date.now();
      if (now - lastClickRef.current < 500) {
        e.preventDefault();
        return;
      }
      lastClickRef.current = now;

      // Call original onClick if provided
      props.onClick?.(e);
    },
    [props.onClick]
  );

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      className={cn(
        "relative transition-all",
        isLoading && "cursor-not-allowed",
        className
      )}
      onClick={handleClick}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {/* Loading spinner */}
      {isLoading && (
        <Loader2
          className="mr-2 h-4 w-4 animate-spin"
          aria-hidden="true"
        />
      )}

      {/* Icon (only shown when not loading) */}
      {!isLoading && icon && (
        <span className="mr-2" aria-hidden="true">
          {icon}
        </span>
      )}

      {/* Button text */}
      <span className={cn(isLoading && "opacity-80")}>
        {isLoading && loadingText ? loadingText : children}
      </span>
    </Button>
  );
});

FormSubmitButton.displayName = "FormSubmitButton";

export { FormSubmitButton };
