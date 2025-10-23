import React from 'react';

type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

interface ProgressProps {
  value?: number; // Current progress value (for determinate mode)
  max?: number; // Maximum value (for determinate mode)
  isIndeterminate?: boolean; // If true, progress is indeterminate
  colorVariant?: ColorVariant; // Color theme for the progress bar
  disabled?: boolean; // If true, the progress bar is disabled
  className?: string; // Additional class names for the container
  ariaLabel?: string; // Custom ARIA label for accessibility
}

const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  isIndeterminate = false,
  colorVariant = 'primary',
  disabled = false,
  className = '',
  ariaLabel,
}) => {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  const getColorClasses = (variant: ColorVariant) => {
    switch (variant) {
      case 'primary': return 'bg-[var(--c-brand)]';
      case 'secondary': return 'bg-[var(--c-mid)]';
      case 'success': return 'bg-green-500'; // Example, can be replaced with CSS var
      case 'warning': return 'bg-yellow-500'; // Example, can be replaced with CSS var
      case 'danger': return 'bg-red-600'; // Example, can be replaced with CSS var
      default: return 'bg-[var(--c-brand)]';
    }
  };

  const baseClasses = `relative w-full h-11 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--c-brand)] focus:ring-offset-2 focus:ring-offset-[var(--c-bg)] ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;
  const trackClasses = 'bg-[var(--c-panel)] border border-[var(--c-border)]';
  const barClasses = `h-full rounded-full transition-all duration-300 ease-in-out ${getColorClasses(colorVariant)}`;

  const currentAriaLabel = ariaLabel || (isIndeterminate ? "Loading..." : `Progress: ${percentage.toFixed(0)}%`);

  return (
    <div
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : value}
      aria-valuemin={isIndeterminate ? undefined : 0}
      aria-valuemax={isIndeterminate ? undefined : max}
      aria-label={currentAriaLabel}
      className={`${baseClasses} ${trackClasses}`}
      tabIndex={disabled ? -1 : 0} // Make div focusable for keyboard navigation
    >
      {isIndeterminate ? (
        <div className={`${barClasses} animate-indeterminate-progress`}></div>
      ) : (
        <div className={barClasses} style={{ width: `${percentage}%` }}></div>
      )}
      {!isIndeterminate && (
        <span className="sr-only">{`${percentage.toFixed(0)}%`}</span>
      )}
    </div>
  );
};

export default Progress;
