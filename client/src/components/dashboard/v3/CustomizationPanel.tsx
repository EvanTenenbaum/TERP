import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
    if (confirm('Reset dashboard to default layout? This will undo all customizations.')) {
      resetToDefault();
    }
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
                {widgets.map((widget, index) => {
                  const metadata = WIDGET_METADATA[widget.id as keyof typeof WIDGET_METADATA];
                  const isFirst = index === 0;
                  const isLast = index === widgets.length - 1;
                  
                  return (
                    <div key={widget.id} className="flex items-start space-x-3 group">
                      <Checkbox
                        id={widget.id}
                        checked={widget.isVisible}
                        onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={widget.id} className="cursor-pointer">
                          <div className="font-medium">{metadata?.name || widget.id}</div>
                          <div className="text-sm text-muted-foreground">
                            {metadata?.description || ''}
                          </div>
                        </Label>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveWidgetUp(widget.id)}
                          disabled={isFirst}
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveWidgetDown(widget.id)}
                          disabled={isLast}
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
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
                onClick={handleReset}
              >
                Reset to Default
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
