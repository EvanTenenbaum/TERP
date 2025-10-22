import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Notification Settings</h1>
          <p className="text-sm text-muted-foreground">Manage notification preferences</p>
        </div>
        <Button onClick={() => toast.success("Settings saved")}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
      <Card className="p-6">
        <p className="text-muted-foreground">Notification settings - Coming soon</p>
      </Card>
    </div>
  );
}
