/**
 * Loading State Components
 * UX-004: Reusable loading state components for better UX
 *
 * Provides various loading indicators for different contexts:
 * - LoadingState: Full loading state with message
 * - LoadingSpinner: Inline spinner
 * - PageLoading: Full page loading
 * - ButtonLoading: Loading state for buttons
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Full loading state with spinner and optional message
 */
export function LoadingState({
  message = "Loading...",
  size = "md",
  className,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn(
          "animate-spin text-muted-foreground",
          sizeClasses[size]
        )}
      />
      {message && (
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Inline loading spinner
 */
export function LoadingSpinner({
  size = "sm",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <Loader2
      className={cn("animate-spin", sizeClasses[size], className)}
      role="status"
      aria-label="Loading"
    />
  );
}

interface PageLoadingProps {
  message?: string;
}

/**
 * Full page loading state
 */
export function PageLoading({ message }: PageLoadingProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingState message={message} size="lg" />
    </div>
  );
}

interface ButtonLoadingProps {
  children?: React.ReactNode;
}

/**
 * Loading state content for buttons
 * Usage: <Button disabled>{isLoading ? <ButtonLoading>Saving...</ButtonLoading> : "Save"}</Button>
 */
export function ButtonLoading({ children }: ButtonLoadingProps) {
  return (
    <>
      <LoadingSpinner className="mr-2" />
      {children || "Loading..."}
    </>
  );
}

interface InlineLoadingProps {
  message?: string;
  className?: string;
}

/**
 * Inline loading indicator with text
 */
export function InlineLoading({
  message = "Loading...",
  className,
}: InlineLoadingProps) {
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
      <LoadingSpinner size="sm" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

interface CardLoadingProps {
  className?: string;
}

/**
 * Loading state for card content
 */
export function CardLoading({ className }: CardLoadingProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-8 text-muted-foreground",
        className
      )}
    >
      <LoadingState message="Loading..." size="sm" />
    </div>
  );
}

interface TableLoadingProps {
  colSpan?: number;
  message?: string;
}

/**
 * Loading state for table body
 */
export function TableLoading({
  colSpan = 1,
  message = "Loading data...",
}: TableLoadingProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-8 text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <LoadingSpinner size="md" />
          <span className="text-sm">{message}</span>
        </div>
      </td>
    </tr>
  );
}

export default {
  LoadingState,
  LoadingSpinner,
  PageLoading,
  ButtonLoading,
  InlineLoading,
  CardLoading,
  TableLoading,
};
