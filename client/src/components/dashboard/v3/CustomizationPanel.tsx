import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { LAYOUT_PRESETS, WIDGET_METADATA } from '@/lib/constants/dashboardPresets';

export function CustomizationPanel() {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const {
    isCustomizing,
    setIsCustomizing,
    activeLayoutId,
    setActiveLayout,
    widgets,
    toggleWidgetVisibility,
    moveWidgetUp,
    moveWidgetDown,
    resetToDefault,
  } = useDashboardPreferences();

  const handleReset = () => {
    resetToDefault();
    setShowResetConfirm(false);
  };

  return (
    <Sheet open={isCustomizing} onOpenChange={setIsCustomizing}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Choose a layout preset or customize widget visibility
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] mt-6">
          <div className="space-y-6">
            {/* Layout Presets */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Layout Presets</h3>
              <RadioGroup value={activeLayoutId} onValueChange={setActiveLayout}>
                {Object.entries(LAYOUT_PRESETS).map(([id, preset]) => (
                  <div key={id} className="flex items-start space-x-3 mb-3">
                    <RadioGroupItem value={id} id={id} className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor={id} className="cursor-pointer">
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {preset.description}
                        </div>
                      </Label>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Widget Visibility */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Widget Visibility</h3>
              <div className="space-y-3">
                {/* Show all available widgets from metadata, not just current widgets array */}
                {/* This ensures Widget Visibility section is always visible, even when custom layout has empty widgets */}
                {Object.keys(WIDGET_METADATA).map((widgetId) => {
                  const metadata = WIDGET_METADATA[widgetId as keyof typeof WIDGET_METADATA];
                  // Find widget in current widgets array, or create default
                  const widget = widgets.find(w => w.id === widgetId) || {
                    id: widgetId,
                    isVisible: false,
                    isExpanded: false,
                  };
                  const widgetIndex = widgets.findIndex(w => w.id === widgetId);
                  const isFirst = widgetIndex === 0;
                  const isLast = widgetIndex === widgets.length - 1 || widgetIndex === -1;
                  
                  return (
                    <div key={widgetId} className="flex items-start space-x-3 group">
                      <Checkbox
                        id={widgetId}
                        checked={widget.isVisible}
                        onCheckedChange={() => toggleWidgetVisibility(widgetId)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={widgetId} className="cursor-pointer">
                          <div className="font-medium">{metadata?.name || widgetId}</div>
                          <div className="text-sm text-muted-foreground">
                            {metadata?.description || ''}
                          </div>
                        </Label>
                      </div>
                      {/* Only show move buttons if widget is in current widgets array */}
                      {widgetIndex >= 0 && (
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => moveWidgetUp(widgetId)}
                            disabled={isFirst}
                            title="Move up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => moveWidgetDown(widgetId)}
                            disabled={isLast}
                            title="Move down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Reset Button */}
            <div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowResetConfirm(true)}
              >
                Reset to Default
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Reset Confirmation Dialog */}
        <ConfirmDialog
          open={showResetConfirm}
          onOpenChange={setShowResetConfirm}
          title="Reset Dashboard"
          description="Reset dashboard to default layout? This will undo all customizations."
          confirmLabel="Reset"
          variant="destructive"
          onConfirm={handleReset}
        />
      </SheetContent>
    </Sheet>
  );
}
