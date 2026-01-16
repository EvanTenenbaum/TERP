/**
 * ReceiptCapture Component - WS-006
 * Receipt and screenshot generation for transactions
 *
 * Features:
 * - Generate receipt image/PDF for transactions
 * - Screenshot current tab/element state
 * - Save to order/transaction record
 * - Print support
 * - Email receipt option
 * - Download options (PNG, PDF)
 */

import React, { useState, useCallback, useMemo } from "react";

/**
 * Escape HTML entities to prevent XSS attacks
 */
function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Download,
  Mail,
  Printer,
  Loader2,
  CheckCircle2,
  Image,
  FileText,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface ReceiptCaptureProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** ID of the receipt to generate/view (if existing) */
  receiptId?: number;
  /** Transaction data for generating new receipt */
  transactionData?: {
    clientId: number;
    clientName: string;
    transactionType: "PAYMENT" | "CREDIT" | "ADJUSTMENT" | "STATEMENT";
    previousBalance: number;
    transactionAmount: number;
    newBalance: number;
    note?: string;
    transactionId?: number;
  };
  /** Element ref to capture screenshot from (optional) */
  captureElementRef?: React.RefObject<HTMLElement>;
  /** Title for the dialog */
  title?: string;
}

interface CapturedScreenshot {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: Date;
}

// ============================================================================
// SCREENSHOT UTILITIES
// ============================================================================

/**
 * Capture screenshot of an element using html2canvas
 */
async function captureScreenshot(
  element: HTMLElement
): Promise<CapturedScreenshot> {
  // Dynamically import html2canvas
  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2, // Higher quality
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
 * Download data URL as file
 */
function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Print content
 */
function printContent(content: string, title: string): void {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReceiptCapture({
  open,
  onOpenChange,
  receiptId,
  transactionData,
  captureElementRef,
  title = "Receipt",
}: ReceiptCaptureProps): React.ReactElement {
  // State
  const [activeTab, setActiveTab] = useState<"receipt" | "screenshot">(
    receiptId || transactionData ? "receipt" : "screenshot"
  );
  const [screenshot, setScreenshot] = useState<CapturedScreenshot | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    html: string;
    pdfDataUri?: string;
  } | null>(null);

  // tRPC mutations
  const generateReceipt = trpc.receipts.generate.useMutation();
  const getReceiptPreview = trpc.receipts.getPreview.useQuery(
    { receiptId: receiptId ?? 0 },
    { enabled: !!receiptId }
  );
  const sendReceiptEmail = trpc.receipts.sendEmail.useMutation();
  const downloadReceiptPdf = trpc.receipts.downloadPdf.useQuery(
    { receiptId: receiptId ?? 0 },
    { enabled: false } // Manual trigger
  );

  // Handle screenshot capture
  const handleCaptureScreenshot = useCallback(async () => {
    if (!captureElementRef?.current) {
      toast.error("No element to capture");
      return;
    }

    setIsCapturing(true);
    try {
      const captured = await captureScreenshot(captureElementRef.current);
      setScreenshot(captured);
      toast.success("Screenshot captured successfully");
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      toast.error("Failed to capture screenshot");
    } finally {
      setIsCapturing(false);
    }
  }, [captureElementRef]);

  // Handle receipt generation
  const handleGenerateReceipt = useCallback(async () => {
    if (!transactionData) {
      toast.error("No transaction data provided");
      return;
    }

    try {
      const result = await generateReceipt.mutateAsync({
        clientId: transactionData.clientId,
        transactionType: transactionData.transactionType,
        transactionId: transactionData.transactionId,
        previousBalance: transactionData.previousBalance,
        transactionAmount: transactionData.transactionAmount,
        newBalance: transactionData.newBalance,
        note: transactionData.note,
      });

      setReceiptData({ html: result.previewHtml });
      toast.success("Receipt generated successfully");
    } catch (error) {
      console.error("Receipt generation failed:", error);
      toast.error("Failed to generate receipt");
    }
  }, [transactionData, generateReceipt]);

  // Handle download screenshot as PNG
  const handleDownloadScreenshot = useCallback(() => {
    if (!screenshot) return;

    const filename = `screenshot-${screenshot.timestamp.toISOString().split("T")[0]}.png`;
    downloadDataUrl(screenshot.dataUrl, filename);
    toast.success("Screenshot downloaded");
  }, [screenshot]);

  // Handle download as PDF
  const handleDownloadPdf = useCallback(async () => {
    if (!receiptId) {
      toast.error("No receipt ID available");
      return;
    }

    try {
      const result = await downloadReceiptPdf.refetch();
      if (result.data?.pdfDataUri) {
        downloadDataUrl(
          result.data.pdfDataUri,
          result.data.filename || "receipt.pdf"
        );
        toast.success("PDF downloaded");
      }
    } catch (error) {
      console.error("PDF download failed:", error);
      toast.error("Failed to download PDF");
    }
  }, [receiptId, downloadReceiptPdf]);

  // Handle print
  const handlePrint = useCallback(() => {
    if (activeTab === "screenshot" && screenshot) {
      const imgHtml = `<img src="${screenshot.dataUrl}" style="max-width: 100%;" />`;
      printContent(imgHtml, "Screenshot");
    } else if (receiptData?.html || getReceiptPreview.data) {
      const html = receiptData?.html || getReceiptPreview.data || "";
      printContent(html, "Receipt");
    } else {
      toast.error("Nothing to print");
    }
  }, [activeTab, screenshot, receiptData, getReceiptPreview.data]);

  // Handle send email
  const handleSendEmail = useCallback(async () => {
    if (!emailAddress) {
      toast.error("Please enter an email address");
      return;
    }

    if (!receiptId) {
      toast.error("No receipt to send");
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendReceiptEmail.mutateAsync({
        receiptId,
        email: emailAddress,
      });
      toast.success(`Receipt sent to ${emailAddress}`);
      setEmailAddress("");
    } catch (error) {
      console.error("Email send failed:", error);
      toast.error("Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  }, [emailAddress, receiptId, sendReceiptEmail]);

  // Build safe fallback HTML with escaped user content
  const safeFallbackHtml = useMemo(() => {
    if (!transactionData) return "";
    const safeClientName = escapeHtml(transactionData.clientName);
    const amount = Math.abs(transactionData.transactionAmount || 0).toFixed(2);
    const balance = (transactionData.newBalance || 0).toFixed(2);
    return `
      <div style="text-align: center; padding: 20px;">
        <h3>Receipt Preview</h3>
        <p>Client: ${safeClientName}</p>
        <p>Amount: $${amount}</p>
        <p>New Balance: $${balance}</p>
      </div>
    `;
  }, [transactionData]);

  // Render preview content
  const previewContent =
    receiptData?.html || getReceiptPreview.data || transactionData ? (
      <div
        className="bg-white rounded border p-4 max-h-[400px] overflow-auto"
        dangerouslySetInnerHTML={{
          __html:
            receiptData?.html ||
            getReceiptPreview.data ||
            safeFallbackHtml,
        }}
      />
    ) : (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No receipt data available</p>
        {transactionData && (
          <Button onClick={handleGenerateReceipt} className="mt-4">
            Generate Receipt
          </Button>
        )}
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Generate, capture, print, or email receipts and screenshots.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as "receipt" | "screenshot")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receipt" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Receipt
            </TabsTrigger>
            <TabsTrigger value="screenshot" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Screenshot
            </TabsTrigger>
          </TabsList>

          {/* Receipt Tab */}
          <TabsContent value="receipt" className="space-y-4">
            {previewContent}

            {/* Email Section - Disabled (not configured) */}
            {receiptId && (
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email integration not configured"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  className="flex-1"
                  disabled={true}
                />
                <Button
                  onClick={handleSendEmail}
                  disabled={true}
                  title="Email integration not configured. Contact your administrator to enable this feature."
                >
                  <Mail className="h-4 w-4" />
                  <span className="ml-2">Send</span>
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Screenshot Tab */}
          <TabsContent value="screenshot" className="space-y-4">
            {screenshot ? (
              <div className="space-y-4">
                <div className="bg-white rounded border p-2 max-h-[400px] overflow-auto">
                  <img
                    src={screenshot.dataUrl}
                    alt="Captured screenshot"
                    className="max-w-full"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>
                    Captured at {screenshot.timestamp.toLocaleTimeString()} (
                    {screenshot.width}x{screenshot.height}px)
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No screenshot captured</p>
                {captureElementRef && (
                  <Button
                    onClick={handleCaptureScreenshot}
                    disabled={isCapturing}
                    className="mt-4"
                  >
                    {isCapturing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Capturing...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Capture Screenshot
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {activeTab === "receipt" && (
            <>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              {receiptId && (
                <Button onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </>
          )}

          {activeTab === "screenshot" && screenshot && (
            <>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadScreenshot}>
                <Download className="h-4 w-4 mr-2" />
                Download PNG
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReceiptCapture;
