'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon-sm"
        className="h-8 w-8 rounded-md border-border bg-card/60 text-muted-foreground"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isLight = theme === 'light';
  const isDark = theme === 'dark';
  const isSystem = theme === 'system';

  return (
    <div className="relative group">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 rounded-md border-border bg-card/80 text-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Switch application theme (Light, Dark, or System)"
            title="Switch theme (Light, Dark, or System)"
          >
            {isDark ? (
              <Moon className="h-4 w-4 text-purple-400" />
            ) : isSystem ? (
              <Laptop className="h-4 w-4 text-blue-400" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40 p-1 bg-popover border-border shadow-lg">
          <DropdownMenuItem
            onClick={() => setTheme('light')}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer rounded-sm hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span>Light Mode</span>
            </div>
            {isLight && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setTheme('dark')}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer rounded-sm hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5 text-purple-400" />
              <span>Dark Mode</span>
            </div>
            {isDark && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setTheme('system')}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer rounded-sm hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <Laptop className="h-3.5 w-3.5 text-blue-400" />
              <span>System Mode</span>
            </div>
            {isSystem && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Floating Tooltip bubble on hover */}
      <div className="pointer-events-none absolute -bottom-8 right-0 z-50 hidden group-hover:block whitespace-nowrap rounded bg-foreground px-2 py-0.5 text-[10px] text-background shadow-md">
        Switch theme (Light, Dark, or System)
      </div>
    </div>
  );
}
