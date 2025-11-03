import { Settings, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  onCustomizeClick?: () => void;
  onLayoutClick?: () => void;
}

export function DashboardHeader({ onCustomizeClick, onLayoutClick }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your business command center</p>
      </div>
      <div className="flex items-center gap-2">
        {onLayoutClick && (
          <Button variant="outline" size="sm" onClick={onLayoutClick}>
            <LayoutGrid className="h-4 w-4 mr-2" />
            Layout
          </Button>
        )}
        {onCustomizeClick && (
          <Button variant="outline" size="sm" onClick={onCustomizeClick}>
            <Settings className="h-4 w-4 mr-2" />
            Customize
          </Button>
        )}
      </div>
    </div>
  );
}
