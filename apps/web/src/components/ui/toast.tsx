
'use client';

import * as React from 'react';
import { X } from 'lucide-react'; // Assuming lucide-react is available for icons

// --- Interfaces ---
interface ToastProps {
  id: string;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // in milliseconds, 0 for no auto-dismiss
  onClose?: (id: string) => void;
  disabled?: boolean; // For future use, if toast itself can be disabled
}

interface ToastContainerProps {
  children: React.ReactNode;
}

// --- Toast Component ---
const Toast: React.FC<ToastProps> = ({
  id,
  message,
  variant = 'info',
  duration = 5000,
  onClose,
  disabled = false,
}) => {
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        onClose?.(id);
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, id, onClose]);

  const handleClose = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onClose?.(id);
  };

  const baseClasses = `
    relative
    p-4
    pr-10
    rounded-md
    shadow-lg
    flex
    items-center
    justify-between
    space-x-4
    min-h-[44px] // Min 44px tap target for accessibility
    focus:outline-none
    focus:ring-2
    focus:ring-offset-2
    focus:ring-offset-[var(--c-bg)]
    focus:ring-[var(--c-brand)]
    transition-all
    duration-300
    ease-in-out
  `;

  // Updated variant classes to use CSS variables for consistency
  const variantClasses = {
    success: 'bg-[var(--c-brand)] text-[var(--c-ink)] border border-[var(--c-brand)]',
    error: 'bg-[var(--c-error-bg, #ef4444)] text-[var(--c-error-ink, #ffffff)] border border-[var(--c-error-border, #dc2626)]',
    warning: 'bg-[var(--c-warning-bg, #f59e0b)] text-[var(--c-warning-ink, #000000)] border border-[var(--c-warning-border, #d97706)]',
    info: 'bg-[var(--c-panel)] text-[var(--c-ink)] border border-[var(--c-border)]',
  };

  const closeButtonClasses = `
    absolute
    top-1/2
    right-2
    -translate-y-1/2
    p-1
    rounded-full
    hover:bg-[var(--c-mid)]
    focus:outline-none
    focus:ring-2
    focus:ring-offset-2
    focus:ring-offset-[var(--c-bg)]
    focus:ring-[var(--c-brand)]
    min-w-[32px]
    min-h-[32px]
    flex
    items-center
    justify-center
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-70' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={disabled ? -1 : 0} // Make toast focusable for keyboard navigation
    >
      <p className="text-sm font-medium flex-grow">{message}</p>
      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          className={closeButtonClasses}
          aria-label="Close notification"
          disabled={disabled}
          tabIndex={disabled ? -1 : 0} // Ensure button is focusable unless disabled
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// --- ToastContainer Component (for stacking) ---
const ToastContainer: React.FC<ToastContainerProps> = ({ children }) => {
  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {children}
    </div>
  );
};

export { Toast, ToastContainer };

// --- Usage Example (for reference, not part of the component itself) ---
/*
import React, { useState } from 'react';
import { Toast, ToastContainer } from './components/ui/toast';

function App() {
  const [toasts, setToasts] = useState<Array<Omit<ToastProps, 'onClose'>>>([
    { id: '1', message: 'Welcome back!', variant: 'info', duration: 3000 },
    { id: '2', message: 'Item added to cart successfully.', variant: 'success', duration: 5000 },
    { id: '3', message: 'Failed to load data.', variant: 'error', duration: 0 }, // No auto-dismiss
  ]);

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-ink)] p-8">
      <h1 className="text-2xl font-bold mb-4">My Application</h1>
      <button
        onClick={() => {
          const newId = String(Date.now());
          setToasts((prev) => [
            ...prev,
            { id: newId, message: `New notification ${newId}`, variant: 'info', duration: 3000 },
          ]);
        }}
        className="px-4 py-2 bg-[var(--c-brand)] text-[var(--c-ink)] rounded"
      >
        Show Info Toast
      </button>
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </ToastContainer>
    </div>
  );
}

export default App;
*/
