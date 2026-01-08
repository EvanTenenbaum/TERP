/**
 * WS-006: Receipt Preview Component
 * Displays receipt preview with download, email, SMS, and copy link actions
 */

import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Download,
  Mail,
  MessageSquare,
  Link,
  Check,
  Loader2,
  X,
} from "lucide-react";

interface ReceiptPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId: number;
  clientEmail?: string;
  clientPhone?: string;
}

export function ReceiptPreview({
  isOpen,
  onClose,
  receiptId,
  clientEmail,
  clientPhone,
}: ReceiptPreviewProps) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [email, setEmail] = useState(clientEmail || "");
  const [phone, setPhone] = useState(clientPhone || "");
  const [customMessage, setCustomMessage] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const linkCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIXED: Clean up timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (linkCopiedTimeoutRef.current) {
        clearTimeout(linkCopiedTimeoutRef.current);
      }
    };
  }, []);

  // Fetch receipt preview
  const { data: previewHtml, isLoading: previewLoading } =
    trpc.receipts.getPreview.useQuery(
      { receiptId },
      { enabled: isOpen && receiptId > 0 }
    );

  // Mutations
  const sendEmailMutation = trpc.receipts.sendEmail.useMutation();
  const sendSmsMutation = trpc.receipts.sendSms.useMutation();
  const getShareableLinkQuery = trpc.receipts.getShareableLink.useQuery(
    { receiptId },
    { enabled: isOpen && receiptId > 0 }
  );

  const handleDownload = async () => {
    // Open PDF in new tab (will trigger download)
    window.open(`/api/receipts/${receiptId}/pdf`, "_blank");
  };

  const handleSendEmail = async () => {
    try {
      await sendEmailMutation.mutateAsync({
        receiptId,
        email,
        customMessage: customMessage || undefined,
      });
      setShowEmailDialog(false);
      // Show success toast
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  const handleSendSms = async () => {
    try {
      await sendSmsMutation.mutateAsync({
        receiptId,
        phoneNumber: phone,
      });
      setShowSmsDialog(false);
      // Show success toast
    } catch (error) {
      console.error("Failed to send SMS:", error);
    }
  };

  const handleCopyLink = async () => {
    if (getShareableLinkQuery.data?.url) {
      await navigator.clipboard.writeText(getShareableLinkQuery.data.url);
      setLinkCopied(true);
      // FIXED: Use ref to track timeout for proper cleanup
      if (linkCopiedTimeoutRef.current) {
        clearTimeout(linkCopiedTimeoutRef.current);
      }
      linkCopiedTimeoutRef.current = setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Payment Recorded Successfully
            </DialogTitle>
          </DialogHeader>

          {/* Receipt Preview */}
          <div className="border rounded-lg overflow-hidden bg-white">
            {previewLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : previewHtml ? (
              <div
                className="receipt-preview"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Failed to load receipt preview
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={handleDownload}
            >
              <Download className="h-5 w-5" />
              <span className="text-xs">PDF</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={() => setShowEmailDialog(true)}
              disabled={!clientEmail}
              title={!clientEmail ? "No email on file" : "Send via email"}
            >
              <Mail className="h-5 w-5" />
              <span className="text-xs">Email</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={() => setShowSmsDialog(true)}
              disabled={!clientPhone}
              title={!clientPhone ? "No phone on file" : "Send via SMS"}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs">SMS</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={handleCopyLink}
            >
              {linkCopied ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Link className="h-5 w-5" />
              )}
              <span className="text-xs">{linkCopied ? "Copied!" : "Link"}</span>
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Receipt via Email</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">To</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Pre-filled from client profile
              </p>
            </div>

            <div>
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Thank you for your payment!"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={!email || sendEmailMutation.isPending}
            >
              {sendEmailMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={showSmsDialog} onOpenChange={setShowSmsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Receipt via SMS</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
              <p className="text-xs text-gray-500 mt-1">
                A link to the receipt will be sent
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSmsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendSms}
              disabled={!phone || sendSmsMutation.isPending}
            >
              {sendSmsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReceiptPreview;
