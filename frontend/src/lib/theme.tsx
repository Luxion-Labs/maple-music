/**
 * Theme system — React port of ui/src/lib/theme.svelte.ts
 * Manages accent/palette themes + custom overrides via CSS custom properties.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeId = 'rose' | 'blue' | 'lime' | 'purple' | 'teal' | 'catppuccin' | 'caffeine' | 'neon' | 'breeze';

type ThemeKind = 'accent' | 'palette';

interface ThemeEntry {
  id: ThemeId;
  label: string;
  kind: ThemeKind;
  color: string;
  fg: string;
}

export const THEMES: ThemeEntry[] = [
  { id: 'rose',       label: 'Rose',       kind: 'accent',  color: 'oklch(0.455 0.188 13.697)', fg: 'oklch(0.985 0 0)' },
  { id: 'blue',       label: 'Blue',       kind: 'accent',  color: 'oklch(0.49 0.22 264)',       fg: 'oklch(0.985 0 0)' },
  { id: 'lime',       label: 'Lime',       kind: 'accent',  color: 'oklch(0.77 0.2 131)',        fg: 'oklch(0.205 0 0)' },
  { id: 'purple',     label: 'Purple',     kind: 'accent',  color: 'oklch(0.56 0.25 302)',       fg: 'oklch(0.985 0 0)' },
  { id: 'teal',       label: 'Teal',       kind: 'accent',  color: 'oklch(0.85 0.13 181)',       fg: 'oklch(0.205 0 0)' },
  { id: 'catppuccin', label: 'Catppuccin', kind: 'palette', color: 'oklch(0.5547 0.2503 297)',   fg: 'oklch(0.985 0 0)' },
  { id: 'caffeine',   label: 'Caffeine',   kind: 'palette', color: 'oklch(0.4341 0.0392 42)',    fg: 'oklch(0.985 0 0)' },
  { id: 'neon',       label: 'Neon',       kind: 'palette', color: 'oklch(0.6726 0.2904 341)',   fg: 'oklch(0.985 0 0)' },
  { id: 'breeze',     label: 'Breeze',     kind: 'palette', color: 'oklch(0.7227 0.1920 150)',   fg: 'oklch(0.205 0 0)' },
];

export const FONTS: { label: string; value: string }[] = [
  { label: 'System',       value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Oxanium',      value: "'Oxanium Variable', sans-serif" },
  { label: 'IBM Plex Sans', value: "'IBM Plex Sans Variable', sans-serif" },
  { label: 'Montserrat',   value: "'Montserrat Variable', sans-serif" },
  { label: 'Outfit',       value: "'Outfit Variable', sans-serif" },
  { label: 'DM Sans',      value: "'DM Sans Variable', sans-serif" },
];

export interface Custom {
  accent: string | null;
  hue: number | null;
  radius: number | null;
  fontSans: string | null;
  fontHeading: string | null;
}

export interface Appearance {
  artworkBackground: boolean;
  tabbedPlayer: boolean;
  openPlayerOnPlay: boolean;
}

const DEFAULT_APPEARANCE: Appearance = {
  artworkBackground: true,
  tabbedPlayer: true,
  openPlayerOnPlay: true,
};

const KEY = 'primary-theme';
const CUSTOM_KEY = 'custom-theme';
const APPEARANCE_KEY = 'appearance';
const PALETTE_CLASSES = THEMES.filter((t) => t.kind === 'palette').map((t) => `theme-${t.id}`);
const ACCENT_VARS = ['--primary', '--primary-foreground', '--accent', '--accent-foreground'] as const;
const CUSTOM_VARS = ['--hue', '--radius', '--font-sans', '--font-heading'] as const;

function isLight(hex: string): boolean {
  const m = /^#([0-9a-f]{6})/i.exec(hex);
  if (!m) return false;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

function applyThemeToDom(id: ThemeId, custom: Custom): void {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  const root = document.documentElement;
  ACCENT_VARS.forEach((v) => root.style.removeProperty(v));
  CUSTOM_VARS.forEach((v) => root.style.removeProperty(v));
  root.classList.remove(...PALETTE_CLASSES);

  if (t.kind === 'accent') {
    root.style.setProperty('--primary', t.color);
    root.style.setProperty('--primary-foreground', t.fg);
    root.style.setProperty('--accent', t.color);
    root.style.setProperty('--accent-foreground', t.fg);
  } else {
    root.classList.add(`theme-${t.id}`);
  }

  if (custom.accent) {
    const fg = isLight(custom.accent) ? 'oklch(0.205 0 0)' : 'oklch(0.985 0 0)';
    root.style.setProperty('--primary', custom.accent);
    root.style.setProperty('--primary-foreground', fg);
    root.style.setProperty('--accent', custom.accent);
    root.style.setProperty('--accent-foreground', fg);
  }
  if (custom.hue !== null) root.style.setProperty('--hue', String(custom.hue));
  if (custom.radius !== null) root.style.setProperty('--radius', `${custom.radius}rem`);
  if (custom.fontSans) root.style.setProperty('--font-sans', custom.fontSans);
  if (custom.fontHeading) root.style.setProperty('--font-heading', custom.fontHeading);
}

// ---- Context ----
interface ThemeContextValue {
  themeId: ThemeId;
  custom: Custom;
  appearance: Appearance;
  setTheme: (id: ThemeId) => void;
  setCustom: (patch: Partial<Custom>) => void;
  resetCustom: () => void;
  setAppearance: (patch: Partial<Appearance>) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: 'rose',
  custom: { accent: null, hue: null, radius: null, fontSans: null, fontHeading: null },
  appearance: DEFAULT_APPEARANCE,
  setTheme: () => {},
  setCustom: () => {},
  resetCustom: () => {},
  setAppearance: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

function loadCustom(): Custom {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '{}');
    const c: Custom = { accent: null, hue: null, radius: null, fontSans: null, fontHeading: null };
    if (typeof saved?.accent === 'string') c.accent = saved.accent;
    if (typeof saved?.fontSans === 'string') c.fontSans = saved.fontSans;
    if (typeof saved?.fontHeading === 'string') c.fontHeading = saved.fontHeading;
    if (typeof saved?.hue === 'number') c.hue = saved.hue;
    if (typeof saved?.radius === 'number') c.radius = saved.radius;
    return c;
  } catch { return { accent: null, hue: null, radius: null, fontSans: null, fontHeading: null }; }
}

function loadAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? '{}');
    return {
      artworkBackground: typeof saved?.artworkBackground === 'boolean' ? saved.artworkBackground : DEFAULT_APPEARANCE.artworkBackground,
      tabbedPlayer: typeof saved?.tabbedPlayer === 'boolean' ? saved.tabbedPlayer : DEFAULT_APPEARANCE.tabbedPlayer,
      openPlayerOnPlay: typeof saved?.openPlayerOnPlay === 'boolean' ? saved.openPlayerOnPlay : DEFAULT_APPEARANCE.openPlayerOnPlay,
    };
  } catch { return DEFAULT_APPEARANCE; }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(KEY) as ThemeId | null;
    return stored && THEMES.some((t) => t.id === stored) ? stored : 'rose';
  });
  const [custom, setCustomState] = useState<Custom>(loadCustom);
  const [appearance, setAppearanceState] = useState<Appearance>(loadAppearance);

  useEffect(() => {
    applyThemeToDom(themeId, custom);
  }, [themeId, custom]);

  const setTheme = useCallback((id: ThemeId) => {
    const safe = THEMES.some((t) => t.id === id) ? id : 'rose';
    setThemeIdState(safe);
    localStorage.setItem(KEY, safe);
  }, []);

  const setCustom = useCallback((patch: Partial<Custom>) => {
    setCustomState((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetCustom = useCallback(() => {
    setCustom({ accent: null, hue: null, radius: null, fontSans: null, fontHeading: null });
  }, [setCustom]);

  const setAppearance = useCallback((patch: Partial<Appearance>) => {
    setAppearanceState((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ themeId, custom, appearance, setTheme, setCustom, resetCustom, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
};
