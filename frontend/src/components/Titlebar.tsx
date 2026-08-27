import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Minus, Square, X, Users, Loader2, CheckCircle2, Music, Minimize2,
} from 'lucide-react';
import { AccountMenu } from './AccountMenu';
import { useAuth } from '../features/auth/AuthContext';
import { useToast } from './Toast';
import * as api from '../lib/api';
import { closeWindow, minimize, toggleMaximize } from '../lib/win';
import { cn } from '../lib/utils';

// Port of ui/src/lib/components/Titlebar.svelte. The window runs undecorated
// (tauri.conf `decorations: false`); this custom bar provides window controls,
// back/forward, and the integrations (Last.fm, Discord, Listen Together, mini player).
// Everything on the bar is a drag region except the buttons.

const LastFmGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 512 512" fill="currentColor" className={className} aria-hidden="true">
    <path d="M308.214,337.861l-5.663-13.064L253.93,209.107c-16.056-40.931-56.085-68.601-101.198-68.601c-61.043,0-110.576,51.706-110.576,115.524c0,63.756,49.533,115.493,110.576,115.493c42.618,0,79.604-25.164,98.062-62.007l19.668,47.329c-27.876,35.526-70.298,58.155-117.729,58.155C68.645,415.002,0.5,343.886,0.5,256.031c0-87.834,68.145-159.033,152.231-159.033c63.446,0,114.696,35.361,140.741,98.093c1.946,4.865,27.516,67.255,49.834,120.369c13.788,32.856,25.537,54.678,63.776,56.023c37.441,1.325,63.249-22.484,63.249-52.648c0-29.45-19.7-36.542-52.825-48.042c-59.543-20.486-90.308-41.065-90.308-90.401c0-48.115,31.303-80.205,82.295-80.205c33.137,0,57.162,15.424,73.756,46.169l-32.618,17.37c-12.235-17.909-25.765-25-42.97-25c-23.934,0-40.94,17.381-40.94,40.465c0,32.805,28.095,37.742,67.348,51.179c52.866,17.981,77.431,38.529,77.431,89.801c0,53.86-44.232,93.093-102.006,93.01C356.256,412.942,327.861,385.769,308.214,337.861z" />
  </svg>
);

const DiscordGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
    <path d="M20.992 20.163c-1.511-0.099-2.699-1.349-2.699-2.877 0-0.051 0.001-0.102 0.004-0.153l-0 0.007c-0.003-0.048-0.005-0.104-0.005-0.161 0-1.525 1.19-2.771 2.692-2.862l0.008-0c1.509 0.082 2.701 1.325 2.701 2.847 0 0.062-0.002 0.123-0.006 0.184l0-0.008c0.003 0.050 0.005 0.109 0.005 0.168 0 1.523-1.191 2.768-2.693 2.854l-0.008 0zM11.026 20.163c-1.511-0.099-2.699-1.349-2.699-2.877 0-0.051 0.001-0.102 0.004-0.153l-0 0.007c-0.003-0.048-0.005-0.104-0.005-0.161 0-1.525 1.19-2.771 2.692-2.862l0.008-0c1.509 0.082 2.701 1.325 2.701 2.847 0 0.062-0.002 0.123-0.006 0.184l0-0.008c0.003 0.048 0.005 0.104 0.005 0.161 0 1.523-1.191 2.768-2.692 2.862l-0.008 0zM26.393 6.465c-1.763-0.832-3.811-1.49-5.955-1.871l-0.149-0.022c-0.005-0.001-0.011-0.002-0.017-0.002-0.035 0-0.065 0.019-0.081 0.047l-0 0c-0.234 0.411-0.488 0.924-0.717 1.45l-0.043 0.111c-1.030-0.165-2.218-0.259-3.428-0.259s-2.398 0.094-3.557 0.275l0.129-0.017c-0.27-0.63-0.528-1.142-0.813-1.638l0.041 0.077c-0.017-0.029-0.048-0.047-0.083-0.047-0.005 0-0.011 0-0.016 0.001l0.001-0c-2.293 0.403-4.342 1.060-6.256 1.957l0.151-0.064c-0.017 0.007-0.031 0.019-0.040 0.034l-0 0c-2.854 4.041-4.562 9.069-4.562 14.496 0 0.907 0.048 1.802 0.141 2.684l-0.009-0.11c0.003 0.029 0.018 0.053 0.039 0.070l0 0c2.14 1.601 4.628 2.891 7.313 3.738l0.176 0.048c0.008 0.003 0.018 0.004 0.028 0.004 0.032 0 0.060-0.015 0.077-0.038l0-0c0.535-0.72 1.044-1.536 1.485-2.392l0.047-0.1c0.006-0.012 0.010-0.027 0.010-0.043 0-0.041-0.026-0.075-0.062-0.089l-0.001-0c-0.912-0.352-1.683-0.727-2.417-1.157l0.077 0.042c-0.029-0.017-0.048-0.048-0.048-0.083 0-0.031 0.015-0.059 0.038-0.076l0-0c0.157-0.118 0.315-0.24 0.465-0.364 0.016-0.013 0.037-0.021 0.059-0.021 0.014 0 0.027 0.003 0.038 0.008l-0.001-0c2.208 1.061 4.8 1.681 7.536 1.681s5.329-0.62 7.643-1.727l-0.107 0.046c0.012-0.006 0.025-0.009 0.040-0.009 0.022 0 0.043 0.008 0.059 0.021l-0-0c0.15 0.124 0.307 0.248 0.466 0.365 0.023 0.018 0.038 0.046 0.038 0.077 0 0.035-0.019 0.065-0.046 0.082l-0 0c-0.661 0.395-1.432 0.769-2.235 1.078l-0.105 0.036c-0.036 0.014-0.062 0.049-0.062 0.089 0 0.016 0.004 0.031 0.011 0.044l-0-0.001c0.501 0.96 1.009 1.775 1.571 2.548l-0.040-0.057c0.017 0.024 0.046 0.040 0.077 0.040 0.010 0 0.020-0.002 0.029-0.004l-0.001 0c2.865-0.892 5.358-2.182 7.566-3.832l-0.065 0.047c0.022-0.016 0.036-0.041 0.039-0.069l0-0c0.087-0.784 0.136-1.694 0.136-2.615 0-5.415-1.712-10.43-4.623-14.534l0.052 0.078c-0.008-0.016-0.022-0.029-0.038-0.036l-0-0z" />
  </svg>
);

interface TitlebarProps {
  onOpenListenTogether: () => void;
  ltActive: boolean;
  onSwitchChannel: () => void;
}

const iconBtn =
  'flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground';
const nightBtn = 'flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground';

interface NavDepth {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

function useNavDepth(): NavDepth {
  const location = useLocation();
  const navigate = useNavigate();
  const stateRef = useRef<{ stack: string[]; idx: number }>({ stack: ['/'], idx: 0 });
  const lastPathRef = useRef(location.pathname);
  // 'pop' means the arriving pathname is from onBack/onForward, not a fresh push.
  const isPopRef = useRef(false);
  const [, force] = useState(0);

  useEffect(() => {
    if (location.pathname === lastPathRef.current) return;
    lastPathRef.current = location.pathname;
    if (isPopRef.current) { isPopRef.current = false; return; }
    const { stack, idx } = stateRef.current;
    stateRef.current = {
      stack: [...stack.slice(0, idx + 1), location.pathname],
      idx: idx + 1,
    };
    force((n) => n + 1);
  }, [location.pathname]);

  const { stack, idx } = stateRef.current;
  return {
    canBack: idx > 0,
    canForward: idx < stack.length - 1,
    onBack: () => {
      const s = stateRef.current.stack;
      const i = stateRef.current.idx;
      if (i > 0) {
        isPopRef.current = true;
        stateRef.current = { ...stateRef.current, idx: i - 1 };
        force((n) => n + 1);
        navigate(s[i - 1]);
      }
    },
    onForward: () => {
      const s = stateRef.current.stack;
      const i = stateRef.current.idx;
      if (i < s.length - 1) {
        isPopRef.current = true;
        stateRef.current = { ...stateRef.current, idx: i + 1 };
        force((n) => n + 1);
        navigate(s[i + 1]);
      }
    },
  };
}

export const Titlebar: React.FC<TitlebarProps> = ({
  onOpenListenTogether,
  ltActive,
  onSwitchChannel,
}) => {
  const { account, signIn, signOut } = useAuth();
  const { success: toastSuccess, error: toastError, toast } = useToast();
  const nav = useNavDepth();

  const [discordOn, setDiscordOn] = useState(false);
  const [lastfm, setLastfm] = useState<{ connected: boolean; username: string | null }>({ connected: false, username: null });
  const [connecting, setConnecting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ right: 0, top: 0 });

  const toggleDiscord = useCallback(async () => {
    const next = !discordOn;
    setDiscordOn(next);
    try {
      await api.setSetting('discord_rpc', next ? 'true' : 'false');
      toastSuccess(next ? 'Discord presence on' : 'Discord presence off');
    } catch (e) {
      setDiscordOn(!next);
      toastError(String(e));
    }
  }, [discordOn, toast]);

  useEffect(() => {
    if (!api.isTauri) return;
    let un: (() => void) | undefined;
    api.getSettings().then((s) => setDiscordOn(s.discord_rpc === 'true')).catch(() => {});
    api.lastfmStatus()
      .then((s) => setLastfm({ connected: s.connected, username: s.username ?? null }))
      .catch(() => {});
    api.onLastfmState((s) => {
      const wasConnecting = connecting;
      setConnecting(false);
      setLastfm({ connected: s.connected, username: s.username ?? null });
      if (s.error) toastError(s.error);
      else if (s.connected) toastSuccess(`Scrobbling as ${s.username}`);
      else if (!wasConnecting) toastSuccess('Last.fm disconnected');
    }).then((u) => { un = u; });
    return () => un?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScrobblerClick = async (e: React.MouseEvent) => {
    if (connecting) {
      await api.lastfmDisconnect().catch(() => {});
      return;
    }
    if (lastfm.connected) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuPos({ right: window.innerWidth - r.right, top: r.bottom + 6 });
      setMenuOpen(true);
      return;
    }
    setConnecting(true);
    try {
      await api.lastfmConnect();
      toast('Approve Maple in your browser');
    } catch (err) {
      setConnecting(false);
      toastError(String(err));
    }
  };

  const disconnect = async () => {
    setMenuOpen(false);
    await api.lastfmDisconnect().catch((e) => toastError(String(e)));
  };

  const scrobblerTitle = connecting
    ? 'Connecting to Last.fm — click to cancel'
    : lastfm.connected
      ? `Scrobbling as ${lastfm.username}`
      : 'Scrobble to Last.fm';

  return (
    <div className="relative z-50 flex h-9 shrink-0 select-none items-center justify-between border-b border-border/60 bg-background" data-tauri-drag-region>
      {/* Centered brand */}
      <span className="pointer-events-none absolute inset-x-0 text-center text-xs font-medium tracking-wide text-muted-foreground">
        Maple
      </span>

      {/* Left: logo + back/forward */}
      <div className="flex h-full items-center">
        <span className="pointer-events-none ml-3 mr-1 flex h-4 w-4 items-center justify-center text-primary">
          <Music className="h-4 w-4" />
        </span>
        <button
          className="flex h-full w-9 items-center justify-center text-foreground/80 transition-colors hover:bg-accent/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
          onClick={nav.onBack}
          disabled={!nav.canBack}
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <button
          className="flex h-full w-9 items-center justify-center text-foreground/80 transition-colors hover:bg-accent/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
          onClick={nav.onForward}
          disabled={!nav.canForward}
          title="Forward"
          aria-label="Forward"
        >
          <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Right: account + integrations + window controls */}
      <div className="flex h-full items-center">
        <AccountMenu
          isSignedIn={account.signedIn}
          accountName={account.name ?? undefined}
          accountThumbnail={account.thumbnail ?? undefined}
          accountHandle={account.handle ?? undefined}
          accountEmail={account.email ?? undefined}
          canSwitch
          onSignIn={() => signIn()}
          onSignOut={() => signOut()}
          onSwitchChannel={onSwitchChannel}
        />
        <div className="mx-1.5 h-4 w-px bg-border" />

        {/* Listen Together */}
        <button
          className={cn(iconBtn, ltActive && 'text-primary')}
          onClick={onOpenListenTogether}
          title="Listen Together"
          aria-label="Listen Together"
        >
          <span className="relative">
            <Users className="h-4 w-4" />
            {ltActive && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="absolute inset-0 rounded-full bg-emerald-500 ring-[1.5px] ring-background" />
              </span>
            )}
          </span>
        </button>

        {/* Discord presence */}
        <button
          className={cn(iconBtn, discordOn && 'text-foreground')}
          onClick={() => { void toggleDiscord(); }}
          title={discordOn ? 'Discord presence on — click to turn off' : 'Show what you play on Discord'}
          aria-label="Discord Rich Presence"
        >
          <span className="relative">
            <DiscordGlyph className="h-4 w-4" />
            <span className={cn('absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-[1.5px] ring-background', discordOn ? 'bg-emerald-500' : 'bg-red-500')} />
          </span>
        </button>

        {/* Last.fm scrobbler */}
        <button
          className={cn(iconBtn, lastfm.connected && 'text-foreground')}
          onClick={(e) => { void onScrobblerClick(e); }}
          title={scrobblerTitle}
          aria-label={scrobblerTitle}
        >
          <span className="relative">
            <LastFmGlyph className={cn('h-4 w-4', connecting && 'animate-pulse opacity-60')} />
            {connecting ? (
              <Loader2 className="absolute -bottom-1.5 -right-2 h-3.5 w-3.5 animate-spin rounded-full text-primary" />
            ) : lastfm.connected ? (
              <CheckCircle2 strokeWidth={2.5} className="absolute -bottom-1.5 -right-2 h-3.5 w-3.5 rounded-full bg-background text-primary" />
            ) : null}
          </span>
        </button>

        {/* Mini player */}
        <button
          className={iconBtn}
          onClick={() => { void api.openMini().catch(() => {}); }}
          title="Mini player"
          aria-label="Mini player"
        >
          <Minimize2 className="h-4 w-4" />
        </button>

        <div className="mx-1.5 h-4 w-px bg-border" />

        <button className={nightBtn} onClick={() => { void minimize(); }} aria-label="Minimize">
          <Minus className="h-4 w-4" />
        </button>
        <button className={nightBtn} onClick={() => { void toggleMaximize(); }} aria-label="Maximize">
          <Square className="h-3.5 w-3.5" />
        </button>
        <button className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:text-destructive" onClick={() => { void closeWindow(); }} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {menuOpen && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
          <div
            className="fixed z-50 min-w-52 origin-top-right animate-in rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl duration-150 fade-in-0 zoom-in-95"
            style={{ right: menuPos.right, top: menuPos.top }}
          >
            <div className="flex items-center gap-2.5 px-2 py-2">
              <LastFmGlyph className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium leading-tight">Last.fm</div>
                <div className="truncate text-xs text-muted-foreground">Scrobbling as {lastfm.username}</div>
              </div>
            </div>
            <div className="mx-1 my-1 h-px bg-border" />
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
              onClick={() => { void disconnect(); }}
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
};
