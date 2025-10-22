import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function HygieneSettings() {
  const [settings, setSettings] = useState({
    duplicateCheck: true,
    autoArchive: false,
    dataValidation: true,
    autoCleanup: false
  });

  const handleSave = () => {
    toast.success("Data hygiene settings saved");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Data Hygiene Settings</h1>
          <p className="text-sm text-muted-foreground">Configure data validation and cleanup rules</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="mb-4">Validation Rules</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Duplicate Record Detection</Label>
              <p className="text-sm text-muted-foreground">Warn when creating duplicate records</p>
            </div>
            <Switch 
              checked={settings.duplicateCheck}
              onCheckedChange={(checked) => setSettings({...settings, duplicateCheck: checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Strict Data Validation</Label>
              <p className="text-sm text-muted-foreground">Enforce required fields and formats</p>
            </div>
            <Switch 
              checked={settings.dataValidation}
              onCheckedChange={(checked) => setSettings({...settings, dataValidation: checked})}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4">Automated Cleanup</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Archive Old Records</Label>
              <p className="text-sm text-muted-foreground">Automatically archive records after 2 years</p>
            </div>
            <Switch 
              checked={settings.autoArchive}
              onCheckedChange={(checked) => setSettings({...settings, autoArchive: checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Cleanup Temp Data</Label>
              <p className="text-sm text-muted-foreground">Remove temporary data after 30 days</p>
            </div>
            <Switch 
              checked={settings.autoCleanup}
              onCheckedChange={(checked) => setSettings({...settings, autoCleanup: checked})}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
