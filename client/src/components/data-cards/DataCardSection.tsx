/**
 * DataCardSection Component
 * Complete section with data cards grid and configuration button
 */

import { useState } from "react";
import { DataCardGrid } from "./DataCardGrid";
import { DataCardConfigDropdown } from "./DataCardConfigDropdown";
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
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handleSave = () => {
    // Force re-render to pick up new preferences
    setRefreshKey((prev) => prev + 1);
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {showConfigButton && (
        <div className="flex justify-end">
          <DataCardConfigDropdown
            moduleId={moduleId}
            onSave={handleSave}
          />
        </div>
      )}
      
      <DataCardGrid key={refreshKey} moduleId={moduleId} />
    </div>
  );
}
