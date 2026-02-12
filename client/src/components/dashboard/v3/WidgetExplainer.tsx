import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { WidgetExplainer as WidgetExplainerType } from '@/types/dashboard';

interface WidgetExplainerProps {
  explainer: WidgetExplainerType;
}

export function WidgetExplainer({ explainer }: WidgetExplainerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{explainer.title}</DialogTitle>
          <DialogDescription>{explainer.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Data Source</h4>
            <p className="text-sm text-muted-foreground">{explainer.dataSource}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Update Frequency</h4>
            <p className="text-sm text-muted-foreground">{explainer.updateFrequency}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Use Cases</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {explainer.useCases.map((useCase, _index) => (
                <li key={`usecase-${useCase.substring(0, 30)}`}>{useCase}</li>
              ))}
            </ul>
          </div>
          {explainer.relatedWidgets && explainer.relatedWidgets.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Related Widgets</h4>
              <div className="flex flex-wrap gap-2">
                {explainer.relatedWidgets.map((widget) => (
                  <Badge key={`widget-${widget.substring(0, 30)}`} variant="secondary">
                    {widget}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
