import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-pill text-label font-bold whitespace-nowrap transition-colors outline-none focus-visible:outline-4 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand px-5 text-on-brand hover:opacity-90",
        secondary: "border border-control bg-card px-5 text-ink hover:bg-sunken",
        ghost: "px-4 text-brand hover:bg-brand-soft",
        plain: "px-4 text-ink hover:bg-sunken",
        destructive: "px-4 text-danger hover:bg-danger-soft",
        danger: "bg-danger px-5 text-on-brand hover:opacity-90",
      },
      size: {
        default: "h-10",
        sm: "h-9 text-sm",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button, buttonVariants }
