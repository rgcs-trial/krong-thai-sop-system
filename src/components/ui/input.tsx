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

// Specialized PIN Input component for restaurant authentication
interface PinInputProps extends Omit<InputProps, 'type' | 'maxLength' | 'pattern'> {
  pinLength?: number
  onPinComplete?: (pin: string) => void
}

const PinInput = React.forwardRef<HTMLInputElement, PinInputProps>(
  ({ className, pinLength = 4, onPinComplete, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, pinLength)
      e.target.value = value
      
      if (value.length === pinLength && onPinComplete) {
        onPinComplete(value)
      }
      
      props.onChange?.(e)
    }

    return (
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={pinLength}
        className={cn(
          "flex h-16 w-full rounded-md border-2 border-input bg-transparent px-4 py-3 font-ui shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krong-red focus-visible:ring-offset-2 focus-visible:border-krong-red disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
          // PIN-specific styling
          "text-center text-3xl font-bold tracking-[0.5em] min-h-[64px]",
          "hover:border-krong-red/50 focus:shadow-lg focus:border-krong-red",
          // Restaurant environment optimizations
          "bg-krong-white/90 backdrop-blur-sm",
          className
        )}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
PinInput.displayName = "PinInput"

// Search Input variant optimized for tablet
interface SearchInputProps extends InputProps {
  onSearchChange?: (value: string) => void
  debounceMs?: number
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearchChange, debounceMs = 300, ...props }, ref) => {
    const [searchTerm, setSearchTerm] = React.useState("")
    const timeoutRef = React.useRef<NodeJS.Timeout>()

    React.useEffect(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        onSearchChange?.(searchTerm)
      }, debounceMs)

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [searchTerm, debounceMs, onSearchChange])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value)
      props.onChange?.(e)
    }

    return (
      <input
        ref={ref}
        type="search"
        className={cn(
          "flex h-12 w-full rounded-md border-2 border-input bg-transparent px-4 py-3 text-tablet-base font-ui shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krong-red focus-visible:ring-offset-2 focus-visible:border-krong-red disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation",
          "min-h-[48px] leading-relaxed",
          "hover:border-krong-red/50 focus:shadow-md",
          // Search specific styling
          "pl-10", // Space for search icon
          className
        )}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

export { Input, PinInput, SearchInput }