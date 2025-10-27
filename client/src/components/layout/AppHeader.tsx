import { Bell, Search, Settings, User, Menu, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FloatingScratchPad } from '@/components/FloatingScratchPad';
import { useState } from 'react';
import versionInfo from '../../version.json';

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const [scratchPadOpen, setScratchPadOpen] = useState(false);

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-border bg-card">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden mr-2"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Version Display */}
      <div className="flex items-center gap-2 mr-4">
        <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
          v{versionInfo.version}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {versionInfo.commit}
        </span>
      </div>

      {/* Search bar */}
      <div className="flex items-center flex-1 max-w-2xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search quotes, customers, products..."
            className="pl-10 w-full"
          />
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-1 md:gap-2 ml-2">
        <Button variant="ghost" size="icon" className="hidden sm:flex">
          <Bell className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="hidden sm:flex"
          onClick={() => setScratchPadOpen(true)}
          title="Scratch Pad"
        >
          <StickyNote className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden sm:flex">
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
      
      <FloatingScratchPad isOpen={scratchPadOpen} onClose={() => setScratchPadOpen(false)} />
    </header>
  );
}

