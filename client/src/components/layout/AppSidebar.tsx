import { Link, useLocation } from "wouter";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_TITLE } from "@/const";
import { navigationItems } from "@/config/navigation";

interface AppSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ open = false, onClose }: AppSidebarProps) {
  const [location] = useLocation();

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
          <h1 className="text-xl font-bold text-foreground">{APP_TITLE}</h1>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-accent rounded-md"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navigationItems.map(item => {
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
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
