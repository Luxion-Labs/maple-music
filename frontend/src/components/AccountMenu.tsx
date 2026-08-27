import { useState } from 'react';
import { UserCircle, LogOut, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { thumb } from '../lib/thumb';

interface AccountMenuProps {
  isSignedIn?: boolean;
  accountName?: string;
  accountThumbnail?: string;
  accountHandle?: string;
  accountEmail?: string;
  canSwitch?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onSwitchChannel?: () => void;
}

/**
 * Account control menu — sign in, switch channel, sign out.
 * Shows account avatar and name when signed in, "Sign in" button when not.
 */
export function AccountMenu({
  isSignedIn = false,
  accountName,
  accountThumbnail,
  accountHandle,
  accountEmail,
  canSwitch = false,
  onSignIn,
  onSignOut,
  onSwitchChannel,
}: AccountMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [position, setPosition] = useState({ right: 0, top: 0 });

  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPosition({
      right: window.innerWidth - r.right,
      top: r.bottom + 6,
    });
    setMenuOpen(!menuOpen);
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    onSignOut?.();
  };

  const handleSignIn = () => {
    setMenuOpen(false);
    onSignIn?.();
  };

  const handleSwitchChannel = () => {
    setMenuOpen(false);
    onSwitchChannel?.();
  };

  return (
    <>
      <button
        onClick={handleOpenMenu}
        title={isSignedIn ? accountName ?? 'Account' : 'Sign in'}
        aria-expanded={menuOpen}
        className="flex h-full cursor-pointer items-center gap-2 px-2.5 text-xs transition-colors hover:bg-muted aria-expanded:bg-muted"
      >
        {isSignedIn && accountThumbnail ? (
          <img
            src={thumb(accountThumbnail, 64)}
            alt=""
            style={{ width: '1.25rem', height: '1.25rem', maxWidth: 'none' }}
            className="shrink-0 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <UserCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
        <span className="hidden max-w-28 truncate font-medium lg:block">
          {isSignedIn ? accountName ?? 'Account' : 'Sign in'}
        </span>
        <ChevronDown
          className={`hidden h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 lg:block ${
            menuOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {menuOpen && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <div
            className="fixed z-50 w-72 origin-top-right animate-in rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl duration-150 fade-in-0 zoom-in-95"
            style={{ right: `${position.right}px`, top: `${position.top}px` }}
          >
            {isSignedIn ? (
              <>
                <div className="mb-3">
                  <div className="truncate text-sm font-medium">{accountName ?? 'Account'}</div>
                  {(accountHandle || accountEmail) && (
                    <div className="truncate text-xs text-muted-foreground">
                      {accountHandle ?? accountEmail}
                    </div>
                  )}
                </div>
                {canSwitch && onSwitchChannel && (
                  <Button variant="outline" size="sm" className="mb-2 w-full gap-2" onClick={handleSwitchChannel}>
                    <UserCircle className="h-4 w-4" />
                    Switch channel
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Sign in</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sign in with your Google account to reach your YouTube Music library and playlists.
                </p>
                <Button className="mt-3 w-full" onClick={handleSignIn}>
                  Sign in with Google
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
