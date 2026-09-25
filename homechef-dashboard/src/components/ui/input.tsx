import * as React from "react"
import { cn } from "@/lib/utils"

export const fieldStyles =
  "h-10 w-full min-w-0 rounded-sm border border-control bg-card px-3.5 text-base text-ink outline-none placeholder:text-ink-muted/80 focus-visible:outline-4 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldStyles, className)} {...props} />
}

export { Input }
