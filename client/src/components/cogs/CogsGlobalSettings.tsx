import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export function CogsGlobalSettings() {
  
  // Toggle states
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [allowManualAdjustment, setAllowManualAdjustment] = useState(true);
  const [showToAllUsers, setShowToAllUsers] = useState(true);
  
  // Numeric settings states
  const [consignmentPercentage, setConsignmentPercentage] = useState(60);
  const [excellentThreshold, setExcellentThreshold] = useState(70);
  const [goodThreshold, setGoodThreshold] = useState(50);
  const [fairThreshold, setFairThreshold] = useState(30);
  const [lowThreshold, setLowThreshold] = useState(15);
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // TODO: Implement actual API call to save settings
      // For now, simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const settings = {
        autoCalculate,
        allowManualAdjustment,
        showToAllUsers,
        consignmentPercentage,
        marginThresholds: {
          excellent: excellentThreshold,
          good: goodThreshold,
          fair: fairThreshold,
          low: lowThreshold,
        },
      };
      
      // In production, this would be:
      // await api.cogs.updateGlobalSettings(settings);
      
      console.log("Saving COGS settings:", settings);
      
      toast.success("Settings saved", {
        description: "Your COGS settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving COGS settings:", error);
      toast.error("Error saving settings", {
        description: "Failed to save COGS settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Default COGS Behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Default COGS Behavior</CardTitle>
          <CardDescription>
            Configure how COGS is calculated for inventory items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>FIXED mode:</strong> Uses the exact COGS value from the batch.
              <br />
              <strong>RANGE mode:</strong> Uses the midpoint between min and max COGS by default.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-calculate">Auto-calculate COGS</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically calculate COGS based on batch mode
                </p>
              </div>
              <Switch 
                id="auto-calculate"
                checked={autoCalculate}
                onCheckedChange={setAutoCalculate}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-manual">Allow manual COGS adjustment</Label>
                <p className="text-sm text-muted-foreground">
                  Let users override COGS on individual items
                </p>
              </div>
              <Switch 
                id="allow-manual"
                checked={allowManualAdjustment}
                onCheckedChange={setAllowManualAdjustment}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-all">Show COGS to all users</Label>
                <p className="text-sm text-muted-foreground">
                  Display COGS and margin information to all users
                </p>
              </div>
              <Switch 
                id="show-all"
                checked={showToAllUsers}
                onCheckedChange={setShowToAllUsers}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consignment Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consignment Defaults</CardTitle>
          <CardDescription>
            Default COGS estimation for consignment deals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="consignment-percentage">Default consignment COGS percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="consignment-percentage"
                type="number"
                min="0"
                max="100"
                step="1"
                value={consignmentPercentage}
                onChange={(e) => setConsignmentPercentage(Number(e.target.value))}
                className="max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">% of sale price</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Used to estimate COGS for consignment items until vendor invoice is received
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Margin Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Margin Thresholds</CardTitle>
          <CardDescription>
            Configure color-coded margin categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="excellent-threshold">Excellent (Green)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="excellent-threshold"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={excellentThreshold}
                  onChange={(e) => setExcellentThreshold(Number(e.target.value))}
                  className="max-w-[100px]"
                />
                <span className="text-sm text-muted-foreground">%+</span>
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  {excellentThreshold}%+
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="good-threshold">Good (Light Green)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="good-threshold"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={goodThreshold}
                  onChange={(e) => setGoodThreshold(Number(e.target.value))}
                  className="max-w-[100px]"
                />
                <span className="text-sm text-muted-foreground">%+</span>
                <Badge className="bg-green-50 text-green-600 border-green-200">
                  {goodThreshold}%+
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fair-threshold">Fair (Yellow)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="fair-threshold"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={fairThreshold}
                  onChange={(e) => setFairThreshold(Number(e.target.value))}
                  className="max-w-[100px]"
                />
                <span className="text-sm text-muted-foreground">%+</span>
                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {fairThreshold}%+
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="low-threshold">Low (Orange)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="low-threshold"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(Number(e.target.value))}
                  className="max-w-[100px]"
                />
                <span className="text-sm text-muted-foreground">%+</span>
                <Badge className="bg-orange-50 text-orange-700 border-orange-200">
                  {lowThreshold}%+
                </Badge>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Margins below the lowest threshold will be shown in red
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          size="lg" 
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
