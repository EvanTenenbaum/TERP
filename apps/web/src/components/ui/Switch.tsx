
'use client';

import * as React from 'react';
import { useState } from 'react';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, className, ...props }, ref) => {
    const [isChecked, setIsChecked] = useState(checked || false);

    const handleToggle = () => {
      if (disabled) return;
      const newChecked = !isChecked;
      setIsChecked(newChecked);
      onCheckedChange?.(newChecked);
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-labelledby="switch-label"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-var(--c-bg) focus:ring-var(--c-brand)
          ${isChecked ? 'bg-var(--c-brand)' : 'bg-var(--c-mid)'}
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          ${className || ''}
        `}
        style={{ minWidth: '44px', minHeight: '44px' }} // Ensure 44px tap target
      >
        <span className="sr-only" id="switch-label">Toggle switch</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
            ${isChecked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
