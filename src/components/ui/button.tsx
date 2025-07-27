import { forwardRef, ButtonHTMLAttributes } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krong-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-ui touch-manipulation select-none active:scale-95 transition-transform duration-75",
  {
    variants: {
      variant: {
        default:
          "bg-krong-red text-krong-white shadow hover:bg-krong-red/90",
        destructive:
          "bg-red-500 text-krong-white shadow-sm hover:bg-red-500/90",
        outline:
          "border border-krong-red bg-transparent text-krong-red shadow-sm hover:bg-krong-red hover:text-krong-white",
        secondary:
          "bg-earthen-beige text-krong-black shadow-sm hover:bg-earthen-beige/90",
        ghost: "text-krong-black hover:bg-krong-red/10 hover:text-krong-red",
        link: "text-krong-red underline-offset-4 hover:underline",
        accent: "bg-golden-saffron text-krong-black shadow-sm hover:bg-golden-saffron/90",
      },
      size: {
        default: "h-12 px-6 py-3 text-tablet-base min-w-[120px]", // Tablet-optimized default
        sm: "h-10 rounded-md px-4 text-tablet-sm min-w-[100px]",
        lg: "h-14 rounded-md px-8 text-tablet-lg min-w-[140px]", // Large touch target
        xl: "h-16 rounded-lg px-10 text-tablet-xl min-w-[160px]", // Extra large for tablets
        icon: "h-12 w-12", // Square touch target for icons
        "icon-sm": "h-10 w-10",
        "icon-lg": "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
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