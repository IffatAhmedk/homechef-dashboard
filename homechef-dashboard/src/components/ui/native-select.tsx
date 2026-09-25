import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { fieldStyles } from "./input"

/** A normal <select> dressed like our inputs. Use <option> and <optgroup> inside it as usual. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative w-full", className)}>
      <select data-slot="native-select" className={cn(fieldStyles, "appearance-none pr-9")} {...props} />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
    </div>
  )
}

export { NativeSelect }
