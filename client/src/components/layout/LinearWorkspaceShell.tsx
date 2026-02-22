import type { ReactNode } from "react";
import { Command, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface LinearWorkspaceTab<T extends string = string> {
  value: T;
  label: string;
}

interface LinearWorkspaceShellProps<T extends string> {
  title: string;
  description: string;
  activeTab: T;
  tabs: readonly LinearWorkspaceTab<T>[];
  onTabChange: (tab: T) => void;
  meta?: Array<{ label: string; value: ReactNode }>;
  commandStrip?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function LinearWorkspaceShell<T extends string>({
  title,
  description,
  activeTab,
  tabs,
  onTabChange,
  meta = [],
  commandStrip,
  children,
  className,
}: LinearWorkspaceShellProps<T>) {
  return (
    <section className={cn("linear-workspace-shell", className)}>
      <header className="linear-workspace-header">
        <div className="linear-workspace-title-wrap">
          <p className="linear-workspace-eyebrow">Operations Workspace</p>
          <div>
            <h1 className="linear-workspace-title">{title}</h1>
            <p className="linear-workspace-description">{description}</p>
          </div>
        </div>

        <div className="linear-workspace-shortcuts" aria-label="Workspace shortcuts">
          <span className="linear-workspace-shortcut-chip">
            <Search className="h-3.5 w-3.5" />
            Search
          </span>
          <span className="linear-workspace-shortcut-chip">
            <Command className="h-3.5 w-3.5" />
            K
          </span>
        </div>
      </header>

      {meta.length > 0 && (
        <div className="linear-workspace-meta" aria-label="Workspace metadata">
          {meta.map(item => (
            <div key={item.label} className="linear-workspace-meta-item">
              <span className="linear-workspace-meta-label">{item.label}</span>
              <span className="linear-workspace-meta-value">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={value => onTabChange(value as T)}
        className="linear-workspace-tabs"
      >
        <div className="linear-workspace-tab-row">
          <TabsList className={cn("linear-workspace-tabs-list", `linear-workspace-tabs-count-${tabs.length}`)}>
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="linear-workspace-tabs-trigger"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="linear-workspace-command-strip">{commandStrip}</div>
        </div>
        {children}
      </Tabs>
    </section>
  );
}

interface LinearWorkspacePanelProps {
  value: string;
  children: ReactNode;
}

export function LinearWorkspacePanel({ value, children }: LinearWorkspacePanelProps) {
  return (
    <TabsContent value={value} className="linear-workspace-content">
      {children}
    </TabsContent>
  );
}

export default LinearWorkspaceShell;
