/**
 * Toast hook using Sonner
 * Provides a consistent toast API across the application
 */

import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

export function useToast() {
  const toast = ({ title, description, variant, duration }: ToastOptions) => {
    const message = description ? `${title}: ${description}` : title;

    if (variant === "destructive") {
      sonnerToast.error(message, { duration });
    } else {
      sonnerToast.success(message, { duration });
    }
  };

  return { toast };
}
