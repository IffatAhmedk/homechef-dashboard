import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva("inline-flex w-fit items-center gap-1 rounded-pill px-4 py-1 text-caption font-bold", {
  variants: {
    tone: {
      neutral: "bg-stone-soft text-stone",
      good: "bg-leaf-soft text-leaf",
      bad: "bg-danger-soft text-danger",
      warn: "bg-warn-soft text-warn",
      brand: "bg-brand-soft text-brand-deep",
    },
  },
  defaultVariants: { tone: "neutral" },
})

function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge }
