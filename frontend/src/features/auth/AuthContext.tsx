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
    await api.loginWebview();
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
