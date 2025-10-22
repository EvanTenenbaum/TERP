
'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

// Utility to combine class names
import { twMerge } from 'tailwind-merge';

const tagVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--c-brand] focus-visible:ring-offset-2 ring-offset-[--c-bg] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[--c-panel] text-[--c-ink] border border-[--c-border]',
        primary: 'bg-[--c-brand] text-white',
        secondary: 'bg-[--c-mid] text-[--c-ink]',
        outline: 'border border-[--c-border] bg-transparent text-[--c-ink]',
      },
      size: {
        sm: 'h-6 px-2 py-0.5 text-xs',
        md: 'h-8 px-3 py-1 text-sm',
        lg: 'h-10 px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface TagProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tagVariants> {
  removable?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}

const Tag = React.forwardRef<
  HTMLDivElement,
  TagProps
>(
  (
    {
      className,
      variant,
      size,
      removable = false,
      onRemove,
      disabled = false,
      'aria-label': ariaLabel,
      children,
      ...props
    },
    ref
  ) => {
    const handleRemove = (event: React.MouseEvent) => {
      event.stopPropagation();
      if (onRemove && !disabled) {
        onRemove();
      }
    };

    const combinedClassName = twMerge(tagVariants({ variant, size, className }));

    return (
      <div
        ref={ref}
        className={combinedClassName}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={ariaLabel || (typeof children === 'string' ? `Tag: ${children}` : 'Tag')}
        {...props}
      >
        {children}
        {removable && (
          <button
            type="button"
            className={
              twMerge(
                'ml-1 inline-flex items-center justify-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--c-brand] focus-visible:ring-offset-2 ring-offset-[--c-bg]',
                disabled && 'pointer-events-none opacity-50'
              )
            }
            onClick={handleRemove}
            disabled={disabled}
            aria-label={typeof children === 'string' ? `Remove ${children} tag` : 'Remove tag'}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
);

Tag.displayName = 'Tag';

export { Tag, tagVariants };
