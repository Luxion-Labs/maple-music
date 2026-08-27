import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import * as api from '../lib/api';
import { useTheme, THEMES, FONTS, type ThemeId } from '../lib/theme';
import { cn } from '../lib/utils';
import { ColorPicker } from './ColorPicker';
import { Changelog } from './Changelog';
import { Switch } from './Switch';
import { useIsMobile } from '../lib/mobile';

type TabId = 'general' | 'themes' | 'playback' | 'data' | 'about';
const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'themes', label: 'Themes' },
  { id: 'playback', label: 'Playback' },
  { id: 'data', label: 'Data & storage' },
  { id: 'about', label: 'About' },
];

interface Props { open: boolean; onClose: () => void }

export const SettingsDialog: React.FC<Props> = ({ open, onClose }) => {
  const { themeId, custom, appearance, setTheme, setCustom, resetCustom, setAppearance } = useTheme();
  const mobile = useIsMobile();
  const [tab, setTab] = useState<TabId>('general');
  const [screen, setScreen] = useState<'list' | TabId>('list');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<string[]>([]);
  const [proxyInput, setProxyInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    setTab('general');
    setScreen('list');
    setPickerOpen(false);
    Promise.all([
      api.isTauri ? api.getSettings() : Promise.resolve({} as Record<string, string>),
      api.isTauri ? api.getStreamClients() : Promise.resolve([] as string[]),
    ]).then(([s, c]) => {
      setSettings(s); setClients(c); setProxyInput(s.proxy ?? ''); setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  async function set(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
    if (api.isTauri) await api.setSetting(key, value);
  }

  async function clearCaches() {
    setClearing(true);
    try { if (api.isTauri) await api.clearCaches(); } finally { setClearing(false); }
  }

  const quality = settings.quality ?? 'HIGH';
  const historyOn = settings.enable_history !== 'false';
  const autoplayOn = settings.autoplay !== 'false';
  const hideVideosOn = settings.hide_videos === 'true';
  const boiduOn = settings.lyrics_boidu !== 'false';
  const preventDupsOn = settings.prevent_duplicates === 'true';
  const disabled = new Set((settings.disabled_stream_clients ?? '').split(',').map((s) => s.trim()).filter(Boolean));

  const currentTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  // ----- Shared section bodies (used by both layouts) -----
  function body(t: TabId) {
    switch (t) {
      case 'general':
        return (
          <>
            <Row label="Watch history" desc="Register plays in YouTube Music history." end={<Switch checked={historyOn} onChange={(v) => set('enable_history', v ? 'true' : 'false')} />} />
          </>
        );
      case 'themes':
        return (
          <>
            <div className="border-b py-3">
              <div className="mb-2 font-medium">Preset</div>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button key={t.id} onClick={() => setTheme(t.id as ThemeId)}
                    className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors', themeId === t.id ? 'border-primary bg-primary/10' : 'hover:bg-muted')}>
                    <span className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: t.color }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-b py-3">
              <Row label="Accent color" desc="Overrides preset buttons & highlights."
                end={<button onClick={() => setPickerOpen(!pickerOpen)} style={{ background: custom.accent ?? currentTheme.color }}
                  className="h-8 w-8 shrink-0 rounded-md ring-1 ring-black/10 transition-transform hover:scale-105" aria-label="Choose accent color" />} />
              {pickerOpen && <div className="mt-3"><ColorPicker value={custom.accent ?? currentTheme.color} onChange={(hex) => setCustom({ accent: hex })} /></div>}
            </div>
            <div className="border-b py-3">
              <RowEnd label="Interface font"
                end={<select className="rounded-lg border bg-background px-2 py-1 text-sm" value={custom.fontSans ?? ''} onChange={(e) => setCustom({ fontSans: e.target.value || null })}>
                  <option value="">Default</option>
                  {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>} />
            </div>
            <div className="border-b py-3">
              <RowEnd label="Corner radius"
                end={<input type="range" min={0} max={1.5} step={0.05} value={custom.radius ?? 0.5}
                  onChange={(e) => setCustom({ radius: Number(e.target.value) })}
                  className="maple-range w-36 sm:w-44" style={{ '--pct': `${((custom.radius ?? 0.5) / 1.5) * 100}%` } as React.CSSProperties} />} />
            </div>
            <Row label="Open player on play" desc="Open the full player view when you press play." end={<Switch checked={appearance.openPlayerOnPlay} onChange={(v) => setAppearance({ openPlayerOnPlay: v })} />} />
            <Row label="Artwork background" desc="Tint the player with the track's cover art." end={<Switch checked={appearance.artworkBackground} onChange={(v) => setAppearance({ artworkBackground: v })} />} />
            <div className="flex items-center justify-between py-3">
              <div className="font-medium">Reset customization</div>
              <button onClick={resetCustom} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Reset</button>
            </div>
          </>
        );
      case 'playback':
        return (
          <>
            <div className="border-b py-3">
              <div className="font-medium mb-3">Audio quality</div>
              <div className="flex flex-wrap gap-2">
                {['LOW', 'AUTO', 'HIGH'].map((q) => (
                  <button key={q} onClick={() => set('quality', q)}
                    className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', quality === q ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted')}>
                    {q === 'LOW' ? 'Low' : q === 'AUTO' ? 'Auto' : 'High'}
                  </button>
                ))}
              </div>
            </div>
            <Row label="Autoplay" desc="Keep playing similar songs when queue ends." end={<Switch checked={autoplayOn} onChange={(v) => set('autoplay', v ? 'true' : 'false')} />} />
            <Row label="Prevent duplicate tracks" desc="Adding an existing track moves it instead of duplicating." end={<Switch checked={preventDupsOn} onChange={(v) => set('prevent_duplicates', v ? 'true' : 'false')} />} />
            <Row label="Hide music videos" desc="Prefer audio-only versions." end={<Switch checked={hideVideosOn} onChange={(v) => set('hide_videos', v ? 'true' : 'false')} />} />
            <Row label="Word-by-word lyrics" desc="Use lyrics-api.boidu.dev for karaoke-style highlighting." end={<Switch checked={boiduOn} onChange={(v) => set('lyrics_boidu', v ? 'true' : 'false')} />} />
            {clients.length > 0 && (
              <div className="py-3">
                <div className="font-medium mb-2">Stream clients</div>
                {clients.map((name) => (
                  <div key={name} className="flex items-center justify-between gap-4 py-1">
                    <span className="min-w-0 truncate font-mono text-sm">{name}</span>
                    <Switch checked={!disabled.has(name)} onChange={() => {
                      const s = new Set(disabled);
                      s.has(name) ? s.delete(name) : s.add(name);
                      set('disabled_stream_clients', [...s].join(','));
                    }} />
                  </div>
                ))}
              </div>
            )}
          </>
        );
      case 'data':
        return (
          <>
            <div className="border-b py-3">
              <div className="font-medium mb-3">Proxy</div>
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); set('proxy', proxyInput.trim()); }}>
                <input className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-primary/50" value={proxyInput} onChange={(e) => setProxyInput(e.target.value)} placeholder="http://host:port (blank = none)" />
                <button type="submit" className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">Save</button>
              </form>
            </div>
            <div className="py-3">
              <div className="font-medium mb-2">Cache</div>
              <button onClick={clearCaches} disabled={clearing} className="rounded-lg bg-destructive px-3 py-1.5 text-sm text-destructive-foreground disabled:opacity-50">
                {clearing ? 'Clearing…' : 'Clear caches'}
              </button>
            </div>
          </>
        );
      case 'about':
        return (
          <>
            <div className="border-b py-3">
              <div className="font-heading text-lg font-bold">Maple</div>
              <p className="mt-1 text-sm text-muted-foreground">A cross-platform YouTube Music client — ad-free playback straight from YouTube's private API, with your real library.</p>
            </div>
            <div className="py-3">
              <h3 className="font-medium mb-2">Changelog</h3>
              <Changelog />
            </div>
          </>
        );
    }
  }

  // ----- Desktop: side-by-side tab rail + content -----
  if (!mobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex h-auto max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Settings</h2>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col sm:h-[28rem] sm:flex-row">
            <nav className="flex shrink-0 overflow-x-auto border-b p-2 sm:w-48 sm:flex-col sm:border-b-0 sm:border-r">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn('shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:w-full sm:px-3 sm:py-2 sm:text-left', tab === t.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground')}>
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="min-w-0 flex-1 overflow-y-auto px-6 py-4">
              {!loaded ? <p className="text-sm text-muted-foreground">Loading…</p> : body(tab)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- Mobile: Spotify-style full-screen page with drill-down sections -----
  const inSection = screen !== 'list';
  const currentTab = TABS.find((t) => t.id === screen);
  const goBack = () => { if (inSection) setScreen('list'); else onClose(); };
  const goHome = () => { setScreen('list'); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-card">
      {/* top bar */}
      <div className="shrink-0 border-b pt-safe">
        <div className="flex items-center gap-1 px-2 py-2.5">
        <button onClick={goBack} className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted" aria-label={inSection ? 'Back' : 'Close'}>
          {inSection ? <ChevronLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1 px-1">
          <h2 className="truncate text-base font-bold">{inSection ? currentTab?.label ?? 'Settings' : 'Settings'}</h2>
        </div>
        {inSection && (
          <button onClick={goHome} className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted" aria-label="Close settings">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      </div>

      {/* content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {!loaded ? (
          <p className="py-4 text-sm text-muted-foreground">Loading…</p>
        ) : !inSection ? (
          <ul className="divide-y">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setScreen(t.id)}
                  className="flex w-full items-center justify-between gap-3 py-3.5 text-start active:opacity-70"
                >
                  <span className="text-[15px] font-medium">{t.label}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          body(screen)
        )}
      </div>
    </div>
  );
};

// Spotify-style single-line row: label left, control right, desc wraps beneath the label.
function Row({ label, desc, end }: { label: string; desc: string; end: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{label}</div>
        {desc && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{desc}</p>}
      </div>
      <div className="shrink-0">{end}</div>
    </div>
  );
}

// Row without a description (keeps the label/control on one baseline).
function RowEnd({ label, end }: { label: string; end: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1 font-medium">{label}</div>
      <div className="shrink-0">{end}</div>
    </div>
  );
}
