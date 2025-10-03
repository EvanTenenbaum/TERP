import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-c-ink">{label}</label>}
      <input
        ref={ref}
        className={`w-full px-3 py-2 border border-c-line rounded-md bg-c-paper text-c-ink focus:outline-none focus:ring-2 focus:ring-c-brand ${className}`}
        {...props}
      />
    </div>
  )
);
Input.displayName = 'Input';
