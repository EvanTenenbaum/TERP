import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function RoundingSettings() {
  const [currency, setCurrency] = useState("USD");
  const [decimalPlaces, setDecimalPlaces] = useState("2");
  const [roundingMethod, setRoundingMethod] = useState("standard");

  const handleSave = () => {
    toast.success("Currency and rounding settings saved");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Currency & Rounding</h1>
          <p className="text-sm text-muted-foreground">Configure currency display and rounding options</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="mb-4">Currency Settings</h3>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Decimal Places</Label>
            <Select value={decimalPlaces} onValueChange={setDecimalPlaces}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 (Whole numbers)</SelectItem>
                <SelectItem value="2">2 (Standard)</SelectItem>
                <SelectItem value="4">4 (Precision)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4">Rounding Options</h3>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Rounding Method</Label>
            <Select value={roundingMethod} onValueChange={setRoundingMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (Round Half Up)</SelectItem>
                <SelectItem value="down">Always Round Down</SelectItem>
                <SelectItem value="up">Always Round Up</SelectItem>
                <SelectItem value="bankers">Banker's Rounding</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Applies to calculations, taxes, and totals
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
