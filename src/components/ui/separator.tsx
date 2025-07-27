import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils"

interface SeparatorProps 
  extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  variant?: "default" | "brand" | "accent" | "subtle"
  thickness?: "thin" | "medium" | "thick"
}

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(
  (
    { 
      className, 
      orientation = "horizontal", 
      decorative = true, 
      variant = "default",
      thickness = "thin",
      ...props 
    },
    ref
  ) => {
    const thicknessMap = {
      thin: orientation === "horizontal" ? "h-[1px]" : "w-[1px]",
      medium: orientation === "horizontal" ? "h-[2px]" : "w-[2px]",
      thick: orientation === "horizontal" ? "h-[4px]" : "w-[4px]",
    }

    const variantMap = {
      default: "bg-border",
      brand: "bg-krong-red/20",
      accent: "bg-golden-saffron/30",
      subtle: "bg-border/50",
    }

    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          "shrink-0 transition-colors duration-200",
          orientation === "horizontal" ? "w-full" : "h-full",
          thicknessMap[thickness],
          variantMap[variant],
          // Tablet-optimized spacing
          orientation === "horizontal" ? "my-4" : "mx-4",
          className
        )}
        {...props}
      />
    )
  }
)
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }