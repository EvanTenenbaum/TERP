import { Link, useLocation } from "wouter";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_TITLE } from "@/const";
import { buildNavigationGroups } from "@/config/navigation";
import { useFeatureFlags } from "@/hooks/useFeatureFlag";
import { Skeleton } from "@/components/ui/skeleton";

interface AppSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ open = false, onClose }: AppSidebarProps) {
  const [location] = useLocation();
  const { flags, isLoading: featureFlagsLoading } = useFeatureFlags();
  const groupedNavigation = buildNavigationGroups({
    flags,
    flagsLoading: featureFlagsLoading,
  });

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out z-50",
          "md:relative md:translate-x-0",
          "fixed inset-y-0 left-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <div className="flex items-center gap-2"><img src="/terp-icon.png" alt="TERP" className="w-8 h-8 rounded" /><h1 className="text-xl font-bold text-foreground">{APP_TITLE}</h1></div>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-accent rounded-md"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupedNavigation.map(group => (
            <div key={group.key} className="space-y-2">
              <p
                className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                data-testid="nav-group-label"
              >
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map(item => {
                  const isActive = location === item.path;
                  const Icon = item.icon;

                  return (
                    <li key={item.path}>
                      <Link href={item.path}>
                        <a
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon className="h-5 w-5" />
                          {item.name}
                        </a>
                      </Link>
                    </li>
                  );
                })}
                {featureFlagsLoading &&
                  group.loadingFeatureItems.map(item => (
                    <li
                      key={`${item.path}-skeleton`}
                      className="flex items-center gap-3 px-3 py-2 rounded-md"
                    >
                      <Skeleton className="h-5 w-5 rounded-md" />
                      <Skeleton className="h-4 w-24" />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
