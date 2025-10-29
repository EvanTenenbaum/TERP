/**
 * DataCardSection Component
 * Complete section with data cards grid and configuration button
 */

import { useState } from "react";
import { DataCardGrid } from "./DataCardGrid";
import { DataCardConfigModal } from "./DataCardConfigModal";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataCardSectionProps {
  moduleId: string;
  className?: string;
  showConfigButton?: boolean;
}

export function DataCardSection({
  moduleId,
  className,
  showConfigButton = true,
}: DataCardSectionProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handleSave = () => {
    // Force re-render to pick up new preferences
    setRefreshKey((prev) => prev + 1);
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {showConfigButton && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigOpen(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Customize Metrics
          </Button>
        </div>
      )}
      
      <DataCardGrid key={refreshKey} moduleId={moduleId} />
      
      <DataCardConfigModal
        moduleId={moduleId}
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSave={handleSave}
      />
    </div>
  );
}
