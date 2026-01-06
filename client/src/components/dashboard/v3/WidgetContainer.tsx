import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Expand, Minimize2, Info } from 'lucide-react';
import { WidgetExplainer } from './WidgetExplainer';
import type { WidgetSize, WidgetExplainer as WidgetExplainerType } from '@/types/dashboard';

interface WidgetContainerProps {
  id: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  explainer?: WidgetExplainerType;
  isExpanded: boolean;
  onToggleExpand: () => void;
  size?: WidgetSize;
  footer?: ReactNode;
}

export function WidgetContainer({
  id,
  title,
  icon,
  children,
  explainer,
  isExpanded,
  onToggleExpand,
  size = 'md',
  footer,
}: WidgetContainerProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const headerContent = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        {explainer && <WidgetExplainer explainer={explainer} />}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Expand className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  const compactView = (
    <Card>
      <CardHeader className="pb-3">
        {headerContent}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <div className="px-6 pb-6">{footer}</div>}
    </Card>
  );

  if (!isExpanded) {
    return compactView;
  }

  // Expanded view - Modal for desktop, Drawer for mobile
  if (isMobile) {
    return (
      <>
        {compactView}
        <Drawer open={isExpanded} onOpenChange={onToggleExpand}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                {icon}
                {title}
              </DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto p-4">{children}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {compactView}
      <Dialog open={isExpanded} onOpenChange={onToggleExpand}>
        <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
