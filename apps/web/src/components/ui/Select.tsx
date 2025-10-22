import React from 'react';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...props }, ref) => (
    <select
      ref={ref}
      className={`px-3 py-2 bg-[var(--c-panel)] border border-[var(--c-border)] text-[var(--c-ink)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--c-brand)] disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
);

Select.displayName = 'Select';
