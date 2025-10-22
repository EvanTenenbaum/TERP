
'use client';

import React, { useState, useRef, useEffect, ReactNode, useCallback } from 'react';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  disabled?: boolean;
  className?: string; // Allows custom styling for the popover content
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  children,
  isOpen: controlledIsOpen,
  onOpenChange,
  disabled = false,
  className,
  placement = 'bottom',
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof controlledIsOpen === 'boolean';
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const closePopover = useCallback(() => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalIsOpen(false);
    }
  }, [isControlled, onOpenChange]);

  const togglePopover = () => {
    if (disabled) return;
    const newState = !isOpen;
    if (isControlled) {
      onOpenChange?.(newState);
    } else {
      setInternalIsOpen(newState);
    }
  };

  const calculatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    // Default offset
    const offset = 8;

    switch (placement) {
      case 'top':
        top = triggerRect.top - popoverRect.height - offset;
        left = triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2);
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (popoverRect.height / 2);
        left = triggerRect.left - popoverRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (popoverRect.height / 2);
        left = triggerRect.right + offset;
        break;
      default:
        break;
    }

    setPopoverStyle({
      top: `${top}px`,
      left: `${left}px`,
      position: 'fixed', // Use fixed positioning for better viewport handling
    });
  }, [isOpen, placement]);

  // Recalculate position on open, scroll, and resize
  useEffect(() => {
    calculatePosition();

    if (isOpen) {
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true); // Use capture phase for scroll
    }

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen, calculatePosition]);

  // Dismiss on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        closePopover();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closePopover]);

  // Escape key support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closePopover();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closePopover]);

  // Focus trap
  useEffect(() => {
    if (isOpen && popoverRef.current) {
      const focusableElements = popoverRef.current.querySelectorAll(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleTabKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
              lastElement?.focus();
              event.preventDefault();
            }
          } else { // Tab
            if (document.activeElement === lastElement) {
              firstElement?.focus();
              event.preventDefault();
            }
          }
        }
      };

      // Focus the first focusable element in the popover when it opens
      if (firstElement) {
        firstElement.focus();
      }
      popoverRef.current.addEventListener('keydown', handleTabKeyPress);

      return () => {
        popoverRef.current?.removeEventListener('keydown', handleTabKeyPress);
        // Return focus to the trigger when the popover closes
        if (triggerRef.current) {
          triggerRef.current.focus();
        }
      };
    } else if (!isOpen && triggerRef.current) {
      // Ensure focus returns to trigger if popover was open and closed by other means (e.g., outside click)
      triggerRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={togglePopover}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        tabIndex={disabled ? -1 : 0} // Make trigger focusable
        role="button" // Indicate it's an interactive element
        className={`cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} focus:outline-none focus:ring-2 focus:ring-[--c-brand] rounded-md inline-block min-w-[44px] min-h-[44px] flex items-center justify-center`}
      >
        {trigger}
      </div>
      {isOpen && (
        <div
          ref={popoverRef}
          style={popoverStyle}
          className={`z-50 p-4 rounded-lg shadow-xl bg-[--c-panel] border border-[--c-border] text-[--c-ink] ${className || ''}`}
          role="dialog"
          aria-modal="true"
          tabIndex={-1} // Make popover focusable for initial focus
        >
          {children}
        </div>
      )}
    </div>
  );
};
