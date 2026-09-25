"use client";

import { createContext, useCallback, useContext, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: "danger" | "normal";
}

interface NoticeOptions {
  title: string;
  message?: string;
}

type Pending =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "notice"; options: NoticeOptions; resolve: () => void };

interface Dialogs {
  /** Asks a yes/no question. Resolves to true when they choose the main button. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Shows a message with an OK button. */
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

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ kind: "confirm", options, resolve })), []);
  const notify = useCallback((options: NoticeOptions) => new Promise<void>((resolve) => setPending({ kind: "notice", options, resolve })), []);

  function answer(ok: boolean) {
    if (pending?.kind === "confirm") pending.resolve(ok);
    else pending?.resolve();
    setPending(null);
  }

  return (
    <DialogsContext.Provider value={{ confirm, notify }}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(open) => !open && answer(false)}>
        {pending && (
          <AlertDialogContent>
            <AlertDialogTitle>{pending.options.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending.options.message ?? ""}</AlertDialogDescription>
            <AlertDialogFooter>
              {pending.kind === "confirm" && <AlertDialogCancel>Cancel</AlertDialogCancel>}
              <AlertDialogAction
                danger={pending.kind === "confirm" && pending.options.tone === "danger"}
                onClick={() => answer(true)}
              >
                {pending.kind === "confirm" ? (pending.options.confirmLabel ?? "Yes") : "OK"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </DialogsContext.Provider>
  );
}
