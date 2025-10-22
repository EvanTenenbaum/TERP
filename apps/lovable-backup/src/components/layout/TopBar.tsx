import { Bell, User, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UniversalSearch } from "./UniversalSearch";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";

export function TopBar() {
  return (
    <header className="h-14 border-b border-border bg-background sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4 gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <UniversalSearch />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toast.info("Alerts panel - Coming soon")}
          >
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Help</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info("Documentation - Coming soon")}>
                Docs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Report issue - Coming soon")}>
                Report Issue
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("About - THCA ERP v2.0.0")}>
                About
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info("Profile - Coming soon")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Keyboard shortcuts: Ctrl+K, N, Ctrl+S, Esc")}>
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.success("Signed out")}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
