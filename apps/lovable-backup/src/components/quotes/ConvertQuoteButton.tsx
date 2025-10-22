import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { convertQuoteToOrder, canConvertQuote } from "@/lib/quoteConversion";
import { QuoteLine } from "./QuoteBuilder";
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";

interface ConvertQuoteButtonProps {
  quoteId: string;
  clientId: string;
  expiresAt: string;
  lines: QuoteLine[];
  notes?: string;
}

export function ConvertQuoteButton({
  quoteId,
  clientId,
  expiresAt,
  lines,
  notes,
}: ConvertQuoteButtonProps) {
  const [isConverting, setIsConverting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const canConvert = canConvertQuote(expiresAt, lines.length > 0);

  const handleConvert = () => {
    if (!canConvert) {
      toast({
        title: "Cannot Convert",
        description: "Quote is expired or has no line items",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    const result = convertQuoteToOrder(quoteId, clientId, lines, notes);

    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });
      navigate(`/sales/orders/${result.orderId}`);
    } else {
      toast({
        title: "Conversion Failed",
        description: result.message,
        variant: "destructive",
      });
    }

    setIsConverting(false);
  };

  return (
    <Button
      onClick={handleConvert}
      disabled={!canConvert || isConverting}
      variant="default"
    >
      <FileText className="mr-2 h-4 w-4" />
      {isConverting ? "Converting..." : "Convert to Order"}
    </Button>
  );
}
