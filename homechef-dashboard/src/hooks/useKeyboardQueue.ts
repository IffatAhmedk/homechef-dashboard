"use client";

import { useEffect } from "react";

/** Wires ArrowLeft/ArrowRight (and optionally Enter) to callbacks while `active`, with cleanup. */
export function useKeyboardQueue(active: boolean, handlers: { onLeft: () => void; onRight: () => void; onConfirm?: () => void }) {
  const { onLeft, onRight, onConfirm } = handlers;

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onLeft();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onRight();
      } else if (e.key === "Enter" && onConfirm) {
        e.preventDefault();
        onConfirm();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onLeft, onRight, onConfirm]);
}
