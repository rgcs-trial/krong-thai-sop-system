import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-tablet-sm font-semibold font-ui transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-krong-red focus:ring-offset-2 touch-manipulation select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-krong-red text-krong-white hover:bg-krong-red/80 shadow-sm hover:shadow-md",
        secondary:
          "border-transparent bg-earthen-beige text-krong-black hover:bg-earthen-beige/80 shadow-sm hover:shadow-md",
        destructive:
          "border-transparent bg-red-500 text-krong-white hover:bg-red-500/80 shadow-sm hover:shadow-md",
        outline: "border-2 border-krong-red text-krong-red hover:bg-krong-red hover:text-krong-white shadow-sm hover:shadow-md",
        success: "border-transparent bg-jade-green text-krong-white hover:bg-jade-green/80 shadow-sm hover:shadow-md",
        warning: "border-transparent bg-golden-saffron text-krong-black hover:bg-golden-saffron/80 shadow-sm hover:shadow-md",
        // Restaurant-specific status badges
        critical: "border-transparent bg-red-600 text-white shadow-md animate-pulse hover:animate-none hover:bg-red-700",
        priority: "border-transparent bg-orange-500 text-white shadow-sm hover:shadow-md hover:bg-orange-600",
        completed: "border-transparent bg-green-500 text-white shadow-sm hover:shadow-md hover:bg-green-600",
        pending: "border-transparent bg-blue-500 text-white shadow-sm hover:shadow-md hover:bg-blue-600",
        inactive: "border-transparent bg-gray-400 text-white shadow-sm",
      },
      size: {
        default: "h-6 px-3 py-1 text-tablet-sm min-h-[24px]",
        sm: "h-5 px-2 py-0.5 text-xs min-h-[20px]",
        lg: "h-8 px-4 py-1.5 text-tablet-base min-h-[32px]", // Tablet-optimized larger badge
        xl: "h-10 px-6 py-2 text-tablet-lg min-h-[40px]", // Extra large for important status
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