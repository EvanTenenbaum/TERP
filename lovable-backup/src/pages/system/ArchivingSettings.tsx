import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function ArchivingSettings() {
  const [settings, setSettings] = useState({
    ordersRetention: "24",
    invoicesRetention: "84",
    autoArchive: true,
    archiveNotifications: false
  });

  const handleSave = () => {
    toast.success("Archiving settings saved");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Archiving Settings</h1>
          <p className="text-sm text-muted-foreground">Configure data retention and archiving rules</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="mb-4">Retention Periods</h3>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Orders (months)</Label>
            <Input 
              type="number"
              value={settings.ordersRetention}
              onChange={(e) => setSettings({...settings, ordersRetention: e.target.value})}
            />
            <p className="text-sm text-muted-foreground">
              Archive orders older than this period
            </p>
          </div>

          <div className="space-y-2">
            <Label>Invoices (months)</Label>
            <Input 
              type="number"
              value={settings.invoicesRetention}
              onChange={(e) => setSettings({...settings, invoicesRetention: e.target.value})}
            />
            <p className="text-sm text-muted-foreground">
              Archive invoices older than this period (min 84 for tax compliance)
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4">Archive Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatic Archiving</Label>
              <p className="text-sm text-muted-foreground">Run archiving process monthly</p>
            </div>
            <Switch 
              checked={settings.autoArchive}
              onCheckedChange={(checked) => setSettings({...settings, autoArchive: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Archive Notifications</Label>
              <p className="text-sm text-muted-foreground">Notify admins when records are archived</p>
            </div>
            <Switch 
              checked={settings.archiveNotifications}
              onCheckedChange={(checked) => setSettings({...settings, archiveNotifications: checked})}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
