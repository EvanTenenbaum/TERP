/**
 * useReceiptCapture Hook - WS-006
 * Hook for capturing screenshots and generating receipts
 *
 * Usage:
 * const { captureRef, capture, isCapturing, screenshot, clearScreenshot } = useReceiptCapture();
 *
 * // Wrap element to capture
 * <div ref={captureRef}>...content...</div>
 *
 * // Trigger capture
 * <button onClick={capture}>Capture</button>
 */

import { useRef, useState, useCallback, type RefObject } from "react";

export interface CapturedScreenshot {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: Date;
}

export interface UseReceiptCaptureReturn {
  /** Ref to attach to the element to capture */
  captureRef: RefObject<HTMLDivElement | null>;
  /** Trigger screenshot capture */
  capture: () => Promise<CapturedScreenshot | null>;
  /** Whether capture is in progress */
  isCapturing: boolean;
  /** Last captured screenshot */
  screenshot: CapturedScreenshot | null;
  /** Clear the screenshot */
  clearScreenshot: () => void;
  /** Download screenshot as PNG */
  downloadPng: (filename?: string) => void;
  /** Download screenshot as PDF (requires jsPDF) */
  downloadPdf: (filename?: string, title?: string) => Promise<void>;
  /** Print screenshot */
  print: () => void;
}

/**
 * Capture screenshot of an element using html2canvas
 */
async function captureElement(
  element: HTMLElement
): Promise<CapturedScreenshot> {
  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true,
  });

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
    timestamp: new Date(),
  };
}

/**
 * Hook for capturing screenshots of elements
 */
export function useReceiptCapture(): UseReceiptCaptureReturn {
  const captureRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState<CapturedScreenshot | null>(null);

  const capture = useCallback(async (): Promise<CapturedScreenshot | null> => {
    if (!captureRef.current) {
      console.error("No element to capture - attach captureRef to an element");
      return null;
    }

    setIsCapturing(true);
    try {
      const captured = await captureElement(captureRef.current);
      setScreenshot(captured);
      return captured;
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const clearScreenshot = useCallback(() => {
    setScreenshot(null);
  }, []);

  const downloadPng = useCallback(
    (filename?: string) => {
      if (!screenshot) {
        console.error("No screenshot to download");
        return;
      }

      const name =
        filename ||
        `screenshot-${screenshot.timestamp.toISOString().split("T")[0]}.png`;
      const link = document.createElement("a");
      link.href = screenshot.dataUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [screenshot]
  );

  const downloadPdf = useCallback(
    async (filename?: string, title?: string) => {
      if (!screenshot) {
        console.error("No screenshot to download");
        return;
      }

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation:
          screenshot.width > screenshot.height ? "landscape" : "portrait",
        unit: "px",
        format: [screenshot.width / 2, screenshot.height / 2],
      });

      if (title) {
        pdf.setFontSize(16);
        pdf.text(title, 20, 30);
      }

      // Add image to PDF
      pdf.addImage(
        screenshot.dataUrl,
        "PNG",
        0,
        title ? 40 : 0,
        screenshot.width / 2,
        screenshot.height / 2
      );

      const name =
        filename ||
        `screenshot-${screenshot.timestamp.toISOString().split("T")[0]}.pdf`;
      pdf.save(name);
    },
    [screenshot]
  );

  const print = useCallback(() => {
    if (!screenshot) {
      console.error("No screenshot to print");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Screenshot</title>
            <style>
              body { margin: 0; padding: 20px; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <img src="${screenshot.dataUrl}" />
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }, [screenshot]);

  return {
    captureRef,
    capture,
    isCapturing,
    screenshot,
    clearScreenshot,
    downloadPng,
    downloadPdf,
    print,
  };
}

export default useReceiptCapture;
