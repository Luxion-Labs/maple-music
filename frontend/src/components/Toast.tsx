import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastKind = 'info' | 'success' | 'error';
interface Toast { id: number; msg: string; kind: ToastKind }

interface ToastCtx {
  toast: (msg: string, kind?: ToastKind) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
}

const ToastContext = createContext<ToastCtx>({
  toast: () => {},
  success: () => {},
  error: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const show = useCallback((msg: string, kind: ToastKind = 'info') => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const api: ToastCtx = {
    toast: show,
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-40 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm shadow-lg',
              'animate-in fade-in-0 slide-in-from-bottom-2 duration-200',
            )}
          >
            {t.kind === 'success' && <CheckCircle className="h-4 w-4 shrink-0 text-primary" />}
            {t.kind === 'error' && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
            {t.kind === 'info' && <Info className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
