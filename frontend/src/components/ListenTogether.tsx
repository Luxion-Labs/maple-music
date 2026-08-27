import React, { useState, useEffect } from 'react';
import { X, Copy, LogOut, Check, Crown, ArrowLeftRight, UserMinus, RefreshCw } from 'lucide-react';
import * as api from '../lib/api';
import { copyText } from '../lib/clipboard';
import { useLT } from '../features/home/LTContext';
import { cn } from '../lib/utils';

interface Props { open: boolean; onClose: () => void }

function makeInvite(server: string, code: string): string {
  return 'LMSC~' + btoa(`${server}|${code}`);
}
function parseInvite(raw: string): { server: string; code: string } | null {
  const s = raw.trim();
  if (s.startsWith('LMSC~')) {
    try {
      const [server, code] = atob(s.slice(5)).split('|');
      return { server: server ?? '', code: (code ?? '').toUpperCase() };
    } catch { return null; }
  }
  return { server: '', code: s.toUpperCase() };
}

export const ListenTogether: React.FC<Props> = ({ open, onClose }) => {
  const { lt } = useLT();
  const [mode, setMode] = useState<'join' | 'host'>('join');
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setName(localStorage.getItem('lt_name') ?? '');
      setServerUrl(lt.serverUrl);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  const inRoom = lt.role !== 'none';
  const isHost = lt.role === 'host';
  const invite = makeInvite(lt.serverUrl, lt.roomCode ?? '');
  const waiting = lt.requesting && lt.role === 'none';

  async function host() {
    if (!name.trim()) return;
    const u = serverUrl.trim();
    if (!u) return;
    setBusy(true);
    try {
      if (u !== lt.serverUrl) await api.ltSetServerUrl(u);
      localStorage.setItem('lt_name', name.trim());
      await api.ltCreateRoom(name.trim());
    } finally { setBusy(false); }
  }

  async function join(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    const parsed = parseInvite(inviteInput);
    if (!parsed?.code) return;
    const server = parsed.server || lt.serverUrl;
    if (!server) return;
    setBusy(true);
    try {
      if (server !== lt.serverUrl) await api.ltSetServerUrl(server);
      localStorage.setItem('lt_name', name.trim());
      await api.ltJoinRoom(parsed.code, name.trim());
    } finally { setBusy(false); }
  }

  async function copyInvite() {
    try { await copyText(invite); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Listen Together</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4">
          {waiting ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <p className="text-sm text-muted-foreground">
                {lt.status === 'connecting' ? 'Connecting…' : 'Waiting for the host to let you in…'}
              </p>
              <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted" onClick={() => api.ltLeave()}>Cancel</button>
            </div>
          ) : !inRoom ? (
            <div className="flex flex-col gap-4">
              <div className="flex rounded-lg bg-muted p-1 text-sm">
                {(['join', 'host'] as const).map((m) => (
                  <button key={m} className={cn('flex-1 rounded-md py-1.5 font-medium transition-colors', mode === m ? 'bg-background shadow-xs' : 'text-muted-foreground')} onClick={() => setMode(m)}>
                    {m === 'join' ? 'Join' : 'Host'}
                  </button>
                ))}
              </div>
              {mode === 'join' ? (
                <form className="flex flex-col gap-3" onSubmit={join}>
                  <div>
                    <div className="mb-1 text-sm font-medium">Invite code</div>
                    <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-primary/50" value={inviteInput} onChange={(e) => setInviteInput(e.target.value)} placeholder="Paste the invite your friend sent" />
                  </div>
                  <div>
                    <div className="mb-1 text-sm font-medium">Your name</div>
                    <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-primary/50" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </div>
                  <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Join session</button>
                </form>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="mb-1 text-sm font-medium">Sync server</div>
                    <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-primary/50" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="wss://your-server/ws" />
                  </div>
                  <div>
                    <div className="mb-1 text-sm font-medium">Your name</div>
                    <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-primary/50" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </div>
                  <button disabled={busy} onClick={host} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Start a session</button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border bg-muted/40 p-4 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {isHost ? 'Hosting' : 'Listening'} · {lt.status}
                </div>
                <div className="mt-2 select-all break-all rounded-md bg-background px-2 py-1.5 text-left font-mono text-[11px] leading-snug">{invite}</div>
                <button onClick={copyInvite} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy invite'}
                </button>
              </div>

              {lt.currentTrack && (
                <div className="flex min-w-0 items-center gap-3">
                  {lt.currentTrack.thumbnail && <img src={lt.currentTrack.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{lt.currentTrack.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{lt.currentTrack.artist}</div>
                  </div>
                </div>
              )}

              {isHost && lt.pendingJoins.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-medium">Join requests</div>
                  {lt.pendingJoins.map((p) => (
                    <div key={p.userId} className="flex min-w-0 items-center gap-2 mb-1">
                      <span className="min-w-0 flex-1 truncate text-sm">{p.username}</span>
                      <button onClick={() => api.ltApproveJoin(p.userId)} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => api.ltRejectJoin(p.userId)} className="rounded border px-2 py-1 text-xs"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="mb-2 text-sm font-medium">In the room ({lt.users.length})</div>
                {lt.users.map((u) => (
                  <div key={u.user_id} className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', u.is_connected ? 'bg-green-500' : 'bg-muted-foreground/40')} />
                    <span className={cn('min-w-0 flex-1 truncate text-sm', !u.is_connected && 'opacity-50')}>
                      {u.username}{u.user_id === lt.myId ? ' (you)' : ''}
                    </span>
                    {u.is_host && <Crown className="h-4 w-4 shrink-0 text-yellow-500" />}
                    {isHost && u.user_id !== lt.myId && (
                      <>
                        <button onClick={() => api.ltTransferHost(u.user_id)} title="Make host" className="shrink-0 text-muted-foreground hover:text-foreground"><ArrowLeftRight className="h-4 w-4" /></button>
                        <button onClick={() => api.ltKick(u.user_id)} title="Remove" className="shrink-0 text-muted-foreground hover:text-destructive"><UserMinus className="h-4 w-4" /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 border-t pt-3">
                {!isHost && (
                  <button onClick={() => api.ltRequestSync()} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
                    <RefreshCw className="h-4 w-4" /> Re-sync
                  </button>
                )}
                <div className="flex-1" />
                <button onClick={() => api.ltLeave()} className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:bg-destructive/90">
                  <LogOut className="h-4 w-4" /> Leave
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
