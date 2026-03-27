import React from "react";
import { Menu, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { APP_TITLE } from "@/const";
import { useLocation } from "wouter";

export interface MobileNavProps {
  onMenuClick?: () => void;
  // BUG-111: expose sidebar open state so the button accurately reflects it
  isMenuOpen?: boolean;
}

export const MobileNav = React.memo(function MobileNav({
  onMenuClick,
  isMenuOpen = false,
}: MobileNavProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="flex items-center justify-between h-14 px-4 border-b border-border md:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* BUG-111: show X when drawer is open so the header isn't contradictory */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-md"
        onClick={onMenuClick}
        aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isMenuOpen}
      >
        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {APP_TITLE}
        </span>
        <span className="text-sm font-semibold text-foreground">Menu</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          onClick={() => setLocation("/notifications")}
        >
          <Bell className="h-5 w-5" />
        </Button>
        {/* TER-891: make avatar a button to access My Account on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full p-0"
          aria-label="My Account"
          onClick={() => setLocation("/account")}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </Button>
      </div>
    </div>
  );
});
