"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            // Tablet optimizations
            "h-12 px-4 text-tablet-base min-w-[200px]",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start"
        // Tablet-optimized positioning
        sideOffset={8}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          // Tablet-friendly month navigation
          showOutsideDays={false}
        />
      </PopoverContent>
    </Popover>
  )
}

// Range date picker for date ranges
interface DateRangePickerProps {
  dateRange?: { from: Date; to?: Date }
  onDateRangeChange?: (range: any) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Pick a date range",
  disabled = false,
  className,
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateRange && "text-muted-foreground",
            // Tablet optimizations
            "h-12 px-4 text-tablet-base min-w-[280px]",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "LLL dd, y")} -{" "}
                {format(dateRange.to, "LLL dd, y")}
              </>
            ) : (
              format(dateRange.from, "LLL dd, y")
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start"
        sideOffset={8}
      >
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={onDateRangeChange}
          numberOfMonths={2}
          showOutsideDays={false}
        />
      </PopoverContent>
    </Popover>
  )
}