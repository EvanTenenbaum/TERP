import { Button } from "@/components/ui/button";
import { generateInvoice } from "@/lib/financeOperations";
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";
import { useState } from "react";

interface InvoiceGeneratorProps {
  orderId: string;
  clientId: string;
  lines: Array<{
    inventory_name: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }>;
  disabled?: boolean;
}

export function InvoiceGenerator({ orderId, clientId, lines, disabled }: InvoiceGeneratorProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);

    const lineItems = lines.map((line) => ({
      description: line.inventory_name,
      qty: line.qty,
      price: line.unit_price,
      total: line.line_total,
    }));

    const invoice = generateInvoice(orderId, clientId, lineItems);

    toast({
      title: "Invoice Generated",
      description: `Invoice ${invoice.id} has been created`,
    });

    setGenerating(false);
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={disabled || generating || lines.length === 0}
      variant="outline"
    >
      <FileText className="mr-2 h-4 w-4" />
      {generating ? "Generating..." : "Generate Invoice"}
    </Button>
  );
}
