import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const ariaLabel = props['aria-label'] || label || props.placeholder;
    
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-c-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-label={ariaLabel}
          className={`w-full px-3 py-2 border border-c-line rounded-md bg-c-paper text-c-ink focus:outline-none focus:ring-2 focus:ring-c-brand ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';
