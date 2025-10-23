import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '' }) => {
  const variants = {
    default: 'bg-[var(--c-panel)] text-[var(--c-mid)] border-[var(--c-border)]',
    success: 'bg-[var(--c-success-bg)] text-[var(--c-success)] border-[var(--c-success)]/30',
    warning: 'bg-[var(--c-warning-bg)] text-[var(--c-warning)] border-[var(--c-warning)]/30',
    error: 'bg-[var(--c-error-bg)] text-[var(--c-error)] border-[var(--c-error)]/30',
    info: 'bg-[var(--c-brand)]/10 text-[var(--c-brand)] border-[var(--c-brand)]/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
