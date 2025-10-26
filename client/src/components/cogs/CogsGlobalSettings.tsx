import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CogsGlobalSettings() {
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
                <Label>Auto-calculate COGS</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically calculate COGS based on batch mode
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow manual COGS adjustment</Label>
                <p className="text-sm text-muted-foreground">
                  Let users override COGS on individual items
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show COGS to all users</Label>
                <p className="text-sm text-muted-foreground">
                  Display COGS and margin information to all users
                </p>
              </div>
              <Switch defaultChecked />
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
            <Label>Default consignment COGS percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                defaultValue="60"
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
              <Label>Excellent (Green)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue="70"
                  className="max-w-[100px]"
                />
                <span className="text-sm text-muted-foreground">%+</span>
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  70%+
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Good (Light Green)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue="50"
                  className="max-w-[100px]"
                />
                <span className="text-sm text-muted-foreground">%+</span>
                <Badge className="bg-green-50 text-green-600 border-green-200">
                  50%+
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fair (Yellow)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue="30"
                  className="max-w-[100px]"
                />
                <span className="text-sm text-muted-foreground">%+</span>
                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  30%+
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Low (Orange)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue="15"
                  className="max-w-[100px]"
                />
                <span className="text-sm text-muted-foreground">%+</span>
                <Badge className="bg-orange-50 text-orange-700 border-orange-200">
                  15%+
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
        <Button size="lg">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}

