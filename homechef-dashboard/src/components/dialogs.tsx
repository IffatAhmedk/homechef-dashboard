"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "normal";
}

interface NoticeOptions {
  title: string;
  message?: string;
  buttonLabel?: string;
}

type Pending =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "notice"; options: NoticeOptions; resolve: () => void };

interface Dialogs {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (options: NoticeOptions) => Promise<void>;
}

const DialogsContext = createContext<Dialogs | null>(null);

export function useDialogs() {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error("useDialogs must be used inside DialogProvider");
  return ctx;
}

/** In-app replacements for the browser's confirm() and alert() pop-ups. */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ kind: "confirm", options, resolve })),
    []
  );
  const notify = useCallback(
    (options: NoticeOptions) => new Promise<void>((resolve) => setPending({ kind: "notice", options, resolve })),
    []
  );

  function close(ok: boolean) {
    if (!pending) return;
    if (pending.kind === "confirm") pending.resolve(ok);
    else pending.resolve();
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const danger = pending?.kind === "confirm" && pending.options.tone === "danger";

  return (
    <DialogsContext.Provider value={{ confirm, notify }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
          <div className="absolute inset-0 bg-ink/50" onClick={() => close(false)} />
          <div className="relative w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <h2 id="dialog-title" className="font-heading text-2xl text-ink">
              {pending.options.title}
            </h2>
            {pending.options.message && <p className="mt-2 text-base text-ink-muted">{pending.options.message}</p>}
            <div className="mt-5 flex justify-end gap-2">
              {pending.kind === "confirm" && (
                <button
                  onClick={() => close(false)}
                  className="rounded-pill border border-control bg-card px-5 text-label font-bold text-ink hover:bg-sunken"
                >
                  {pending.options.cancelLabel ?? "Cancel"}
                </button>
              )}
              <button
                ref={primaryRef}
                onClick={() => close(true)}
                className={`rounded-pill px-5 text-label font-bold text-on-brand hover:opacity-90 ${danger ? "bg-danger" : "bg-brand"}`}
              >
                {pending.kind === "confirm" ? (pending.options.confirmLabel ?? "Yes") : (pending.options.buttonLabel ?? "OK")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogsContext.Provider>
  );
}
