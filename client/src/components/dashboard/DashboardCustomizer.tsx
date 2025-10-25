import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";


export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: "analytics" | "operations" | "leaderboards";
}

interface DashboardCustomizerProps {
  widgets: WidgetConfig[];
  onSave: (widgets: WidgetConfig[]) => void;
}

export function DashboardCustomizer({ widgets: initialWidgets, onSave }: DashboardCustomizerProps) {
  const [widgets, setWidgets] = useState(initialWidgets);


  const toggleWidget = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleSave = () => {
    onSave(widgets);
    // Preferences saved
  };

  const categories = {
    analytics: widgets.filter((w) => w.category === "analytics"),
    operations: widgets.filter((w) => w.category === "operations"),
    leaderboards: widgets.filter((w) => w.category === "leaderboards"),
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Customize Dashboard
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Choose which widgets to display on your dashboard. Changes are saved automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Analytics Widgets */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Analytics
            </h3>
            <div className="space-y-3">
              {categories.analytics.map((widget) => (
                <div key={widget.id} className="flex items-start justify-between space-x-3 p-3 rounded-lg border bg-card">
                  <div className="flex-1">
                    <Label htmlFor={widget.id} className="text-sm font-medium cursor-pointer">
                      {widget.name}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {widget.description}
                    </p>
                  </div>
                  <Switch
                    id={widget.id}
                    checked={widget.enabled}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Operations Widgets */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Operations
            </h3>
            <div className="space-y-3">
              {categories.operations.map((widget) => (
                <div key={widget.id} className="flex items-start justify-between space-x-3 p-3 rounded-lg border bg-card">
                  <div className="flex-1">
                    <Label htmlFor={widget.id} className="text-sm font-medium cursor-pointer">
                      {widget.name}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {widget.description}
                    </p>
                  </div>
                  <Switch
                    id={widget.id}
                    checked={widget.enabled}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard Widgets */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Leaderboards
            </h3>
            <div className="space-y-3">
              {categories.leaderboards.map((widget) => (
                <div key={widget.id} className="flex items-start justify-between space-x-3 p-3 rounded-lg border bg-card">
                  <div className="flex-1">
                    <Label htmlFor={widget.id} className="text-sm font-medium cursor-pointer">
                      {widget.name}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {widget.description}
                    </p>
                  </div>
                  <Switch
                    id={widget.id}
                    checked={widget.enabled}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <Button onClick={handleSave} className="w-full">
            Save Preferences
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

