import React from 'react';
import { Menu, Settings, Users } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { AccountMenu } from './AccountMenu';
import type { Account } from '../lib/api';

interface TopBarProps {
  account: Account;
  onOpenDrawer: () => void;
  onOpenSettings: () => void;
  onOpenListenTogether?: () => void;
  ltActive?: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onSwitchChannel?: () => void;
}

/**
 * Mobile top bar (hamburger + brand + account + settings). Primary navigation is the BottomNav
 * tab bar; the drawer carries the depth (playlists, settings) — YT Music's split.
 */
export const TopBar: React.FC<TopBarProps> = ({
  account,
  onOpenDrawer,
  onOpenSettings,
  onOpenListenTogether,
  ltActive,
  onSignIn,
  onSignOut,
  onSwitchChannel,
}) => (
  <div className="shrink-0 border-b bg-sidebar px-3 text-sidebar-foreground pt-safe">
    <div className="flex h-12 items-center justify-between">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="size-10" onClick={onOpenDrawer} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-heading text-lg font-bold tracking-tight">Maple</span>
      </div>
      <div className="flex items-center">
        <AccountMenu
          isSignedIn={account.signedIn}
          accountName={account.name ?? undefined}
          accountThumbnail={account.thumbnail ?? undefined}
          accountHandle={account.handle ?? undefined}
          accountEmail={account.email ?? undefined}
          canSwitch={account.canSwitch}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          onSwitchChannel={onSwitchChannel}
        />
        {onOpenListenTogether && (
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative size-10', ltActive && 'text-primary')}
            onClick={onOpenListenTogether}
            aria-label="Listen Together"
          >
            <Users className="h-5 w-5" />
            {ltActive && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            )}
          </Button>
        )}
        <Button variant="ghost" size="icon" className="size-10" onClick={onOpenSettings} aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  </div>
);
