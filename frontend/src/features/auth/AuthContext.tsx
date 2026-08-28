import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Account } from '../../lib/api';
import * as api from '../../lib/api';

interface AuthCtx {
  account: Account;
  epoch: number;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthCtx>({
  account: { signedIn: false },
  epoch: 0,
  signIn: async () => {},
  signOut: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<Account>({ signedIn: false });
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!api.isTauri) return;
    api.getAccount().then(setAccount).catch(() => {});
    const cleanup: (() => void)[] = [];
    api.onAuthChanged((a) => setAccount(a)).then((u) => cleanup.push(u));
    return () => cleanup.forEach((u) => u());
  }, []);

  const signIn = async () => {
    if (!api.isTauri) return;
    // On Android, let the user pick which Google ID from the native Credential Manager account
    // chooser (lists the device's Google accounts), then open the webview pre-selected to that ID.
    // The chooser returns null on desktop, when it isn't available, or if the user backs out —
    // in every case we fall back to the plain webview sign-in page.
    let hint: string | undefined;
    try {
      hint = (await api.googleSuggestAccount()) ?? undefined;
    } catch {
      hint = undefined;
    }
    await api.loginWebview(hint);
  };

  const signOut = async () => {
    if (api.isTauri) await api.signOut().catch(() => {});
    setAccount({ signedIn: false });
    setEpoch((e) => e + 1);
  };

  return (
    <AuthContext.Provider value={{ account, epoch, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
