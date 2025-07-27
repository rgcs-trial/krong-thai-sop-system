/**
 * Restaurant Krong Thai SOP Management System
 * Tablet-optimized shadcn/ui component library
 * 
 * All components are optimized for:
 * - Touch-friendly interactions (minimum 44px touch targets)
 * - Tablet screen sizes and orientations
 * - Restaurant branding colors and typography
 * - Bilingual EN/TH support ready
 */

// Core UI Components
export { Button, buttonVariants } from "./button"
export { Badge, badgeVariants } from "./badge"
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./card"
export { 
  Dialog, 
  DialogPortal, 
  DialogOverlay, 
  DialogClose, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogFooter, 
  DialogTitle, 
  DialogDescription 
} from "./dialog"
export { Input, Textarea, PinInput, SearchInput } from "./input"
export { Label } from "./label"
export { 
  Select, 
  SelectGroup, 
  SelectValue, 
  SelectTrigger, 
  SelectContent, 
  SelectLabel, 
  SelectItem, 
  SelectSeparator, 
  SelectScrollUpButton, 
  SelectScrollDownButton 
} from "./select"
export { Separator } from "./separator"
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs"
export { 
  Toast, 
  ToastProvider, 
  ToastViewport, 
  ToastTitle, 
  ToastDescription, 
  ToastClose, 
  ToastAction,
  type ToastProps,
  type ToastActionElement
} from "./toast"
export { Toaster } from "./toaster"

// Additional Components  
export { Progress } from "./progress"
export { Calendar } from "./calendar"
export { DatePicker, DateRangePicker } from "./date-picker"
export { Popover, PopoverTrigger, PopoverContent } from "./popover"

// Hooks
export { useToast, toast } from "../../hooks/use-toast"