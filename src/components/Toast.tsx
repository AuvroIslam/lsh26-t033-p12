/**
 * Toasts.
 *
 * Saving an expense used to be silent: the row simply appeared somewhere in a
 * list of forty. On a ledger that is the wrong feedback — the user needs to
 * know the amount that was recorded, not just that something happened. So each
 * toast states the figure, and money-changing actions carry an Undo.
 *
 * Deliberately dependency-free: a store, a hook and a fixed-position stack.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type ToastTone = 'good' | 'info' | 'bad';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
  /** Offered on anything that changed the ledger. */
  undo?: () => void;
}

interface ToastApi {
  push: (t: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastApi>({ push: () => {} });

/** Announce something to the user. Safe to call from anywhere below the provider. */
export const useToast = (): ToastApi => useContext(ToastContext);

const LIFETIME_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setToasts((cur) => [...cur.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), LIFETIME_MS);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:pr-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tones: Record<ToastTone, string> = {
    good: 'bg-mint',
    info: 'bg-sky',
    bad: 'bg-blush',
  };
  return (
    <div
      className={`nb rise pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 ${tones[toast.tone]}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-[var(--text)]">{toast.title}</p>
          {toast.body && (
            <p className="mt-0.5 text-[12px] leading-relaxed font-medium text-[var(--text)]/75">
              {toast.body}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.();
                onDismiss();
              }}
              className="nb-sm nb-press rounded-full bg-[var(--card)] px-2.5 py-1 text-[11px] font-bold text-[var(--text)]"
            >
              Undo
            </button>
          )}
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded-full px-1.5 text-[15px] leading-none font-bold text-[var(--text)]/50 hover:text-[var(--text)]"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
