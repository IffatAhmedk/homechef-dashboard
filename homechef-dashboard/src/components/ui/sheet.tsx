"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

/** A panel that slides in from the right edge. */
function SheetContent({ className, children, ...props }: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40" />
      <SheetPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-card text-ink shadow-xl outline-none",
          className
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <SheetPrimitive.Title className="font-heading text-2xl text-ink">{title}</SheetPrimitive.Title>
        {description ? (
          <SheetPrimitive.Description className="text-caption text-ink-muted">{description}</SheetPrimitive.Description>
        ) : (
          <SheetPrimitive.Description className="sr-only">{title}</SheetPrimitive.Description>
        )}
      </div>
      <SheetPrimitive.Close className="inline-flex h-10 items-center gap-1 rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
        <XIcon size={18} strokeWidth={2.4} /> Close
      </SheetPrimitive.Close>
    </div>
  )
}

export { Sheet, SheetContent, SheetHeader }
