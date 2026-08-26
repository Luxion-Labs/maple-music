import React, { createContext, useContext, useState, useEffect } from 'react';
import type { LtState } from '../../lib/api';
import * as api from '../../lib/api';

const emptyLt: LtState = {
  status: 'disconnected',
  role: 'none',
  requesting: false,
  roomCode: null,
  myId: null,
  serverUrl: 'wss://lt.maple.fm',
  users: [],
  currentTrack: null,
  queue: [],
  pendingJoins: [],
  suggestions: [],
};

interface LTCtx {
  lt: LtState;
  createRoom: (username: string) => Promise<void>;
  joinRoom: (code: string, username: string) => Promise<void>;
  leave: () => Promise<void>;
  approveJoin: (userId: string) => Promise<void>;
  rejectJoin: (userId: string) => Promise<void>;
  kick: (userId: string) => Promise<void>;
  transferHost: (userId: string) => Promise<void>;
  approveSuggestion: (id: string) => Promise<void>;
  rejectSuggestion: (id: string) => Promise<void>;
  requestSync: () => Promise<void>;
}

const LTContext = createContext<LTCtx>({
  lt: emptyLt,
  createRoom: async () => {},
  joinRoom: async () => {},
  leave: async () => {},
  approveJoin: async () => {},
  rejectJoin: async () => {},
  kick: async () => {},
  transferHost: async () => {},
  approveSuggestion: async () => {},
  rejectSuggestion: async () => {},
  requestSync: async () => {},
});

export const LTProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lt, setLt] = useState<LtState>(emptyLt);

  useEffect(() => {
    if (!api.isTauri) return;
    api.ltGetState().then(setLt).catch(() => {});
    const cleanup: (() => void)[] = [];
    api.onLtState((s) => setLt(s)).then((u) => cleanup.push(u));
    return () => cleanup.forEach((u) => u());
  }, []);

  const wrap = (fn: () => Promise<void>) => () => fn().catch(console.error);

  return (
    <LTContext.Provider value={{
      lt,
      createRoom: (username) => api.ltCreateRoom(username),
      joinRoom: (code, username) => api.ltJoinRoom(code, username),
      leave: () => api.ltLeave(),
      approveJoin: (userId) => api.ltApproveJoin(userId),
      rejectJoin: (userId) => api.ltRejectJoin(userId),
      kick: (userId) => api.ltKick(userId),
      transferHost: (userId) => api.ltTransferHost(userId),
      approveSuggestion: (id) => api.ltApproveSuggestion(id),
      rejectSuggestion: (id) => api.ltRejectSuggestion(id),
      requestSync: () => api.ltRequestSync(),
    }}>
      {children}
    </LTContext.Provider>
  );
};

export const useLT = () => useContext(LTContext);
