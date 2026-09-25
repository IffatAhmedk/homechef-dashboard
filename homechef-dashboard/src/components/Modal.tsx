"use client";

import type { ReactNode } from "react";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";

const WIDTHS = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  /** Wraps the body and footer in a form, so a submit button in `footer` saves it. */
  onSubmit?: (e: React.FormEvent) => void;
  /** Buttons for the bottom bar. */
  footer?: ReactNode;
  size?: keyof typeof WIDTHS;
  children: ReactNode;
}

/** A pop-up window: title with a Close button, a scrolling body, and an optional button bar. */
export function Modal({ title, description, onClose, onSubmit, footer, size = "md", children }: ModalProps) {
  const content = (
    <>
      <DialogBody>{children}</DialogBody>
      {footer && <DialogFooter>{footer}</DialogFooter>}
    </>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={WIDTHS[size]}>
        <DialogHeader title={title} description={description} />
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            {content}
          </form>
        ) : (
          content
        )}
      </DialogContent>
    </Dialog>
  );
}
