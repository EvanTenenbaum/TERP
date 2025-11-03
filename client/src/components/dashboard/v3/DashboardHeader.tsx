import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';

export function DashboardHeader() {
  const { setIsCustomizing } = useDashboardPreferences();

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your business command center</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCustomizing(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Customize
        </Button>
      </div>
    </div>
  );
}
