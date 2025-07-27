import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md border-2 border-input bg-transparent px-4 py-3 text-tablet-base font-ui shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-tablet-base file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krong-red focus-visible:ring-offset-2 focus-visible:border-krong-red disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
          // Tablet-specific optimizations
          "min-h-[48px] text-tablet-base leading-relaxed",
          // PIN input specific styling (detected by type or pattern)
          type === "password" && "text-center text-2xl font-bold tracking-wider",
          props.pattern === "[0-9]*" && "text-center text-2xl font-bold tracking-wider",
          // Enhanced focus states for restaurant environment
          "hover:border-krong-red/50 focus:shadow-md",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// Textarea variant for longer content
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-4 py-3 text-tablet-base font-ui shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krong-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Input, Textarea }