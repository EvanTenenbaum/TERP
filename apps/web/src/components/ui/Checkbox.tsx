import React from 'react';

interface CheckboxProps {
  id?: string;
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ id, label, checked, onChange, disabled, indeterminate }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === ' ' && !disabled) {
      event.preventDefault();
      onChange(!checked);
    }
  };

  const baseClasses = 'relative flex items-center group';
  const containerClasses = `flex items-center min-h-[44px] min-w-[44px] rounded-md focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 focus-within:ring-offset-bg ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;
  const checkboxClasses = `peer h-5 w-5 shrink-0 rounded-sm border transition-all duration-200
    ${checked || indeterminate ? 'border-brand bg-brand' : 'border-c-border bg-c-panel'}
    ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg
  `;
  const iconClasses = `absolute left-0.5 top-0.5 h-4 w-4 text-c-ink pointer-events-none transition-opacity duration-200
    ${checked || indeterminate ? 'opacity-100' : 'opacity-0'}
  `;
  const labelClasses = `ml-2 text-c-ink ${disabled ? 'opacity-50' : ''}`;

  return (
    <div className={baseClasses}>
      <div className={containerClasses}>
        <input
          id={id}
          type="checkbox"
          className={checkboxClasses}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          ref={inputRef}
          aria-checked={indeterminate ? 'mixed' : checked}
          aria-labelledby={label ? `${id}-label` : undefined}
          onKeyDown={handleKeyDown}
        />
        {(checked || indeterminate) && (
          <svg
            className={iconClasses}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {indeterminate ? (
              <line x1="5" y1="12" x2="19" y2="12" />
            ) : (
              <polyline points="20 6 9 17 4 12" />
            )}
          </svg>
        )}
      </div>
      {label && (
        <label htmlFor={id} id={`${id}-label`} className={labelClasses}>
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
