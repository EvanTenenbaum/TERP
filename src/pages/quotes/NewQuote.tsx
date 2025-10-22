import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QuoteBuilder } from "@/components/quotes/QuoteBuilder";
import { mockClients } from "@/lib/mockData";
import { toast } from "sonner";
import { createAuditEntry } from "@/lib/audit";

export default function NewQuote() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState("");
  const [expiresIn, setExpiresIn] = useState("30");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<any[]>([]);

  const total = lines.reduce((sum, line) => sum + line.line_total, 0);

  const handleSave = () => {
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    const quoteId = `QT-${Date.now()}`;
    const quoteData = {
      id: quoteId,
      client_id: clientId,
      expires_in: parseInt(expiresIn),
      notes,
      lines,
      total,
      created_at: new Date().toISOString()
    };

    createAuditEntry({
      action: "create_quote",
      entity_type: "quote",
      entity_id: quoteId,
      after: quoteData,
      ui_context: "NewQuote"
    });

    toast.success("Quote created successfully");
    navigate("/quotes");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/quotes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="mb-1">New Quote</h1>
          <p className="text-sm text-muted-foreground">Create a new quote for a client</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Quote
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {mockClients.filter(c => !c.archived).map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Expires In (Days)</Label>
            <Input
              type="number"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or special terms..."
              rows={5}
            />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <QuoteBuilder
          clientId={clientId}
          lines={lines}
          onLinesChange={setLines}
        />
        
        {lines.length > 0 && (
          <div className="flex justify-end pt-4 border-t mt-4">
            <div className="space-y-2 min-w-[200px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold text-lg">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
