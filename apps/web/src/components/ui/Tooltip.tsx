
'use client';

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';

interface TooltipProps {
  children: React.ReactElement; // The element that triggers the tooltip
  content: React.ReactNode; // The content to display in the tooltip
  position?: 'top' | 'bottom' | 'left' | 'right';
  disabled?: boolean;
  className?: string; // Allow custom classes for the tooltip content
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'top', disabled = false, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});

  const showTooltip = useCallback(() => {
    if (!disabled) {
      setIsVisible(true);
    }
  }, [disabled]);

  const hideTooltip = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Event handlers for hover and focus
  const handleMouseEnter = () => showTooltip();
  const handleMouseLeave = () => hideTooltip();
  const handleFocus = () => showTooltip();
  const handleBlur = () => hideTooltip();

  // Keyboard navigation (Escape key to close)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideTooltip();
      // Return focus to the trigger element after closing
      triggerRef.current?.focus();
    }
  }, [hideTooltip]);

  useEffect(() => {
    const triggerElement = triggerRef.current;
    if (triggerElement) {
      triggerElement.addEventListener('keydown', handleKeyDown);
      return () => {
        triggerElement.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown]);

  // Position calculation using useLayoutEffect for accurate measurements
  useLayoutEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let newTooltipStyle: React.CSSProperties = {};
      let newArrowStyle: React.CSSProperties = {};

      const arrowSize = 8; // Size of the arrow triangle
      const offset = 10; // Distance between trigger and tooltip

      // Center the tooltip relative to the trigger
      const centerX = triggerRect.left + triggerRect.width / 2;
      const centerY = triggerRect.top + triggerRect.height / 2;

      switch (position) {
        case 'top':
          newTooltipStyle = {
            bottom: window.innerHeight - triggerRect.top + offset,
            left: centerX - tooltipRect.width / 2,
          };
          newArrowStyle = {
            bottom: -arrowSize,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            borderColor: 'transparent transparent var(--c-border) var(--c-border)',
          };
          break;
        case 'bottom':
          newTooltipStyle = {
            top: triggerRect.bottom + offset,
            left: centerX - tooltipRect.width / 2,
          };
          newArrowStyle = {
            top: -arrowSize,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            borderColor: 'var(--c-border) var(--c-border) transparent transparent',
          };
          break;
        case 'left':
          newTooltipStyle = {
            top: centerY - tooltipRect.height / 2,
            right: window.innerWidth - triggerRect.left + offset,
          };
          newArrowStyle = {
            right: -arrowSize,
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            borderColor: 'transparent var(--c-border) var(--c-border) transparent',
          };
          break;
        case 'right':
          newTooltipStyle = {
            top: centerY - tooltipRect.height / 2,
            left: triggerRect.right + offset,
          };
          newArrowStyle = {
            left: -arrowSize,
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            borderColor: 'var(--c-border) transparent transparent var(--c-border)',
          };
          break;
      }
      setTooltipStyle(newTooltipStyle);
      setArrowStyle(newArrowStyle);
    }
  }, [isVisible, position, children]);

  // Clone the child element to add event handlers and ARIA attributes
  const triggerElement = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    'aria-describedby': isVisible ? 'tooltip-content' : undefined,
    tabIndex: disabled ? -1 : 0, // Make trigger focusable unless disabled
    // Ensure min 44px tap target for interactive elements (handled by parent styling or child component itself)
    // Added focus-visible for better accessibility and outline styling
    className: `${children.props.className || ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-bg)] inline-block min-w-[44px] min-h-[44px] flex items-center justify-center`,
  });

  // Tailwind CSS classes for dark theme and positioning
  const tooltipClasses = `
    absolute z-50 p-2 rounded-md shadow-lg
    bg-[var(--c-panel)] text-[var(--c-ink)] border border-[var(--c-border)]
    ${isVisible ? 'opacity-100 visible' : 'opacity-0 invisible'}
    transition-opacity duration-200 pointer-events-none
    ${className || ''}
  `;

  const arrowBaseClasses = `
    absolute w-4 h-4 bg-[var(--c-panel)] border-[var(--c-border)]
  `;

  return (
    <>
      {triggerElement}
      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip-content"
          role="tooltip"
          className={tooltipClasses}
          style={tooltipStyle}
        >
          {content}
          <div className={`${arrowBaseClasses} border`} style={arrowStyle}></div>
        </div>
      )}
    </>
  );
};

export { Tooltip };
