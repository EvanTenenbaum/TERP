import React from "react";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { APP_TITLE } from "@/const";

export interface MobileNavProps {
  onMenuClick?: () => void;
}

export const MobileNav = React.memo(function MobileNav({
  onMenuClick,
}: MobileNavProps) {
  return (
    <div className="flex items-center justify-between h-14 px-4 border-b border-border md:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-md"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {APP_TITLE}
        </span>
        <span className="text-sm font-semibold text-foreground">Menu</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src="/avatar.png" alt="User avatar" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
});
