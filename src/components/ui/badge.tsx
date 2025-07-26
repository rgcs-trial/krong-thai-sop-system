import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-tablet-sm font-semibold font-ui transition-colors focus:outline-none focus:ring-2 focus:ring-krong-red focus:ring-offset-2 touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-krong-red text-krong-white hover:bg-krong-red/80",
        secondary:
          "border-transparent bg-earthen-beige text-krong-black hover:bg-earthen-beige/80",
        destructive:
          "border-transparent bg-red-500 text-krong-white hover:bg-red-500/80",
        outline: "border-krong-red text-krong-red hover:bg-krong-red hover:text-krong-white",
        success: "border-transparent bg-jade-green text-krong-white hover:bg-jade-green/80",
        warning: "border-transparent bg-golden-saffron text-krong-black hover:bg-golden-saffron/80",
      },
      size: {
        default: "h-6 px-3 py-1 text-tablet-sm",
        sm: "h-5 px-2 py-0.5 text-xs",
        lg: "h-8 px-4 py-1.5 text-tablet-base", // Tablet-optimized larger badge
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }