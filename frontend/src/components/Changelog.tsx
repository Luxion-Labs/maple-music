import React, { useState, useEffect } from 'react';
import { releaseNotes, openExternal } from '../lib/api';
import type { ReleaseNote } from '../lib/api';

type Span = { t: 'text' | 'b' | 'code' | 'link'; s: string; href?: string };
type Block =
  | { t: 'h'; spans: Span[] }
  | { t: 'p'; spans: Span[] }
  | { t: 'ul'; items: Span[][] }
  | { t: 'pre'; text: string }
  | { t: 'img'; src: string; alt: string };

const IMAGE = /!\[([^\]]*)\]\(([^)]+)\)|<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
const INLINE = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/\S+)|@([\w-]+)/g;

function inline(text: string): Span[] {
  const out: Span[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push({ t: 'text', s: text.slice(last, m.index) });
    if (m[1]) out.push({ t: 'b', s: m[1] });
    else if (m[2]) out.push({ t: 'code', s: m[2] });
    else if (m[3]) out.push({ t: 'link', s: m[3], href: m[4] });
    else if (m[5]) out.push({ t: 'link', s: m[5], href: m[5] });
    else out.push({ t: 'link', s: `@${m[6]}`, href: `https://github.com/${m[6]}` });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ t: 'text', s: text.slice(last) });
  return out;
}

function parse(body: string): Block[] {
  const blocks: Block[] = [];
  let fenced: string[] | null = null;
  for (const raw of body.replaceAll('\r', '').split('\n')) {
    let line = raw.trim();
    if (line.startsWith('```')) {
      if (fenced) blocks.push({ t: 'pre', text: fenced.join('\n') });
      fenced = fenced ? null : [];
      continue;
    }
    if (fenced) { fenced.push(raw); continue; }
    const images = [...line.matchAll(IMAGE)];
    line = line.replace(IMAGE, '').replace(/<\/?[a-z][^>]*>/gi, '').trim();
    for (const m of images) blocks.push({ t: 'img', src: m[2] ?? m[3], alt: m[1] ?? '' });
    if (!line) continue;
    const heading = line.match(/^#{1,6}\s+(.*)/);
    const bullet = line.match(/^[-*]\s+(.*)/);
    if (heading) blocks.push({ t: 'h', spans: inline(heading[1]) });
    else if (bullet) {
      const prev = blocks.at(-1);
      if (prev?.t === 'ul') prev.items.push(inline(bullet[1]));
      else blocks.push({ t: 'ul', items: [inline(bullet[1])] });
    } else blocks.push({ t: 'p', spans: inline(line) });
  }
  return blocks;
}

const day = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';

function Spans({ list }: { list: Span[] }) {
  return (
    <>
      {list.map((s, i) => {
        if (s.t === 'b') return <strong key={i} className="font-medium text-foreground">{s.s}</strong>;
        if (s.t === 'code') return <code key={i} className="rounded bg-muted px-1 py-0.5 text-xs">{s.s}</code>;
        if (s.t === 'link') return <button key={i} type="button" className="text-primary hover:underline" onClick={() => openExternal(s.href!)}>{s.s}</button>;
        return <React.Fragment key={i}>{s.s}</React.Fragment>;
      })}
    </>
  );
}

interface Props { current?: string }

export const Changelog: React.FC<Props> = ({ current }) => {
  const [releases, setReleases] = useState<ReleaseNote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    releaseNotes().then(setReleases).catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="py-2 text-sm text-muted-foreground">Couldn't load the changelog ({error}).</p>;
  if (!releases) return <p className="py-2 text-sm text-muted-foreground">Loading…</p>;
  if (releases.length === 0) return <p className="py-2 text-sm text-muted-foreground">No releases yet.</p>;

  return (
    <>
      {releases.map((r, i) => (
        <details key={r.version} className="border-b last:border-b-0" open={i === 0}>
          <summary className="flex cursor-pointer items-center gap-2 py-2 text-sm marker:text-muted-foreground">
            <span className="font-medium">Version {r.version}</span>
            {r.version === current && (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">installed</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{day(r.date)}</span>
          </summary>
          <div className="pb-3 text-sm text-muted-foreground">
            {parse(r.body).map((b, j) => {
              if (b.t === 'h') return <h4 key={j} className="mt-3 mb-1 font-medium text-foreground"><Spans list={b.spans} /></h4>;
              if (b.t === 'p') return <p key={j} className="mt-1"><Spans list={b.spans} /></p>;
              if (b.t === 'img') return <img key={j} src={b.src} alt={b.alt} loading="lazy" className="mt-2 max-w-full rounded-lg border" />;
              if (b.t === 'pre') return <pre key={j} className="mt-2 overflow-x-auto rounded bg-muted px-2 py-1.5 text-xs">{b.text}</pre>;
              return <ul key={j} className="mt-1 ml-4 list-disc space-y-1">{b.items.map((item, k) => <li key={k}><Spans list={item} /></li>)}</ul>;
            })}
          </div>
        </details>
      ))}
    </>
  );
};
