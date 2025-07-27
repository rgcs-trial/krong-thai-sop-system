import { forwardRef, ButtonHTMLAttributes } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krong-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-ui touch-manipulation select-none active:scale-95 active:transition-transform active:duration-75 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-krong-red text-krong-white shadow-md hover:bg-krong-red/90 hover:shadow-lg border-2 border-transparent focus:border-krong-white/20",
        destructive:
          "bg-red-500 text-krong-white shadow-md hover:bg-red-500/90 hover:shadow-lg border-2 border-transparent",
        outline:
          "border-2 border-krong-red bg-transparent text-krong-red shadow-sm hover:bg-krong-red hover:text-krong-white hover:shadow-md transition-colors duration-200",
        secondary:
          "bg-earthen-beige text-krong-black shadow-md hover:bg-earthen-beige/90 hover:shadow-lg border-2 border-transparent hover:border-krong-black/10",
        ghost: "text-krong-black hover:bg-krong-red/10 hover:text-krong-red border-2 border-transparent hover:border-krong-red/20",
        link: "text-krong-red underline-offset-4 hover:underline border-2 border-transparent focus:border-krong-red/20",
        accent: "bg-golden-saffron text-krong-black shadow-md hover:bg-golden-saffron/90 hover:shadow-lg border-2 border-transparent hover:border-krong-black/10",
        // Restaurant-specific variants
        emergency: "bg-red-600 text-white shadow-lg hover:bg-red-700 border-2 border-transparent animate-pulse hover:animate-none",
        success: "bg-jade-green text-white shadow-md hover:bg-jade-green/90 border-2 border-transparent",
        warning: "bg-orange-500 text-white shadow-md hover:bg-orange-600 border-2 border-transparent",
        info: "bg-blue-500 text-white shadow-md hover:bg-blue-600 border-2 border-transparent",
      },
      size: {
        default: "h-12 px-6 py-3 text-tablet-base min-w-[120px] min-h-[48px]", // Tablet-optimized default
        sm: "h-10 px-4 text-tablet-sm min-w-[100px] min-h-[44px]",
        lg: "h-14 px-8 text-tablet-lg min-w-[140px] min-h-[56px]", // Large touch target
        xl: "h-16 px-10 text-tablet-xl min-w-[160px] min-h-[64px]", // Extra large for tablets
        icon: "h-12 w-12 min-h-[48px] min-w-[48px]", // Square touch target for icons
        "icon-sm": "h-10 w-10 min-h-[44px] min-w-[44px]",
        "icon-lg": "h-14 w-14 min-h-[56px] min-w-[56px]",
        "icon-xl": "h-16 w-16 min-h-[64px] min-w-[64px]",
        // PIN input specific size
        "pin": "h-16 w-16 text-tablet-xl font-bold min-h-[64px] min-w-[64px]",
        // Full width for forms
        "full": "h-12 w-full px-6 py-3 text-tablet-base min-h-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }