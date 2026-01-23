/**
 * usePrint Hook (UXS-903)
 *
 * Programmatic print control for Work Surfaces.
 * Handles print preparation, execution, and cleanup.
 *
 * Features:
 * - Print specific elements or entire page
 * - Before/after print callbacks
 * - Print preview detection
 * - Title customization
 *
 * @see print.css for print styles
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PrintOptions {
  /** Custom document title for print */
  title?: string;
  /** Element ID to print (prints whole page if not specified) */
  elementId?: string;
  /** Callback before print dialog opens */
  onBeforePrint?: () => void;
  /** Callback after print dialog closes */
  onAfterPrint?: () => void;
  /** Add timestamp to title */
  addTimestamp?: boolean;
  /** Custom styles to inject for print */
  customStyles?: string;
  /** Delay before opening print dialog (ms) - allows DOM updates */
  delay?: number;
}

export interface UsePrintReturn {
  /** Trigger print */
  print: (options?: PrintOptions) => Promise<void>;
  /** Whether currently in print mode */
  isPrinting: boolean;
  /** Print a specific element by ref */
  printElement: (element: HTMLElement, options?: PrintOptions) => Promise<void>;
  /** Print preview is active */
  isPreview: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format timestamp for print title
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Create a hidden iframe for isolated printing
 */
function createPrintFrame(): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.style.position = 'absolute';
  frame.style.top = '-10000px';
  frame.style.left = '-10000px';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = 'none';
  document.body.appendChild(frame);
  return frame;
}

/**
 * Copy styles from main document to print frame
 */
function copyStylesToFrame(frameDoc: Document): void {
  // Copy all stylesheets
  const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
  styles.forEach((style) => {
    const clone = style.cloneNode(true) as HTMLElement;
    frameDoc.head.appendChild(clone);
  });
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for print functionality
 *
 * @example
 * ```tsx
 * const { print, isPrinting, printElement } = usePrint();
 *
 * // Print entire page
 * await print({ title: 'Invoice #123' });
 *
 * // Print specific element
 * await printElement(invoiceRef.current, {
 *   title: 'Invoice #123',
 *   addTimestamp: true,
 * });
 * ```
 */
export function usePrint(): UsePrintReturn {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const originalTitle = useRef<string>('');

  // Track print preview state
  useEffect(() => {
    const mediaQueryList = window.matchMedia('print');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsPreview(e.matches);
    };

    // Initial check
    handleChange(mediaQueryList);

    // Listen for changes
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, []);

  // Main print function
  const print = useCallback(async (options: PrintOptions = {}): Promise<void> => {
    const {
      title,
      elementId,
      onBeforePrint,
      onAfterPrint,
      addTimestamp = false,
      customStyles,
      delay = 100,
    } = options;

    setIsPrinting(true);

    // Store original title
    originalTitle.current = document.title;

    try {
      // Set custom title if provided
      if (title) {
        const printTitle = addTimestamp
          ? `${title} - ${formatTimestamp()}`
          : title;
        document.title = printTitle;
      }

      // Call before print callback
      onBeforePrint?.();

      // Add custom styles if provided
      let styleElement: HTMLStyleElement | null = null;
      if (customStyles) {
        styleElement = document.createElement('style');
        styleElement.textContent = customStyles;
        document.head.appendChild(styleElement);
      }

      // If printing specific element, use iframe approach
      if (elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
          throw new Error(`Element with id "${elementId}" not found`);
        }

        const frame = createPrintFrame();
        const frameDoc = frame.contentDocument || frame.contentWindow?.document;

        if (frameDoc) {
          frameDoc.open();
          frameDoc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${title || document.title}</title>
              </head>
              <body>
                ${element.outerHTML}
              </body>
            </html>
          `);
          frameDoc.close();

          copyStylesToFrame(frameDoc);

          // Wait for styles to load
          await new Promise((resolve) => setTimeout(resolve, delay));

          frame.contentWindow?.print();

          // Cleanup
          setTimeout(() => {
            document.body.removeChild(frame);
          }, 1000);
        }
      } else {
        // Print whole page
        await new Promise((resolve) => setTimeout(resolve, delay));
        window.print();
      }

      // Cleanup custom styles
      if (styleElement) {
        document.head.removeChild(styleElement);
      }

      // Call after print callback
      onAfterPrint?.();
    } finally {
      // Restore original title
      document.title = originalTitle.current;
      setIsPrinting(false);
    }
  }, []);

  // Print specific element by reference
  const printElement = useCallback(
    async (element: HTMLElement, options: PrintOptions = {}): Promise<void> => {
      const {
        title,
        onBeforePrint,
        onAfterPrint,
        addTimestamp = false,
        customStyles,
        delay = 100,
      } = options;

      setIsPrinting(true);
      originalTitle.current = document.title;

      try {
        // Set custom title
        if (title) {
          const printTitle = addTimestamp
            ? `${title} - ${formatTimestamp()}`
            : title;
          document.title = printTitle;
        }

        onBeforePrint?.();

        // Create print frame
        const frame = createPrintFrame();
        const frameDoc = frame.contentDocument || frame.contentWindow?.document;

        if (frameDoc) {
          frameDoc.open();
          frameDoc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${title || document.title}</title>
                ${customStyles ? `<style>${customStyles}</style>` : ''}
              </head>
              <body>
                ${element.outerHTML}
              </body>
            </html>
          `);
          frameDoc.close();

          copyStylesToFrame(frameDoc);

          // Wait for styles to load
          await new Promise((resolve) => setTimeout(resolve, delay));

          frame.contentWindow?.print();

          // Cleanup frame after print
          setTimeout(() => {
            document.body.removeChild(frame);
          }, 1000);
        }

        onAfterPrint?.();
      } finally {
        document.title = originalTitle.current;
        setIsPrinting(false);
      }
    },
    []
  );

  return {
    print,
    isPrinting,
    printElement,
    isPreview,
  };
}

// ============================================================================
// Print Button Component
// ============================================================================

export interface PrintButtonProps {
  /** What to print: 'page' for whole page, or element ID */
  target?: 'page' | string;
  /** Custom title for print */
  title?: string;
  /** Button label */
  label?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Before print callback */
  onBeforePrint?: () => void;
  /** After print callback */
  onAfterPrint?: () => void;
}

export default usePrint;
