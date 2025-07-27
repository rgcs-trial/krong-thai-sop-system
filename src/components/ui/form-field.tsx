/**
 * Standardized Form Field Components
 * Consistent styling and accessibility for all form elements
 */

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Base form field wrapper with consistent spacing and error handling
interface FormFieldProps {
  children: React.ReactNode;
  error?: string;
  className?: string;
}

export function FormField({ children, error, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Standardized form label with consistent styling
interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export function FormLabel({ required, children, className, ...props }: FormLabelProps) {
  return (
    <Label 
      className={cn("text-sm font-medium text-gray-900 dark:text-gray-100", className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
  );
}

// Enhanced input field with consistent styling and accessibility
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
}

export function FormInput({ 
  label, 
  error, 
  required, 
  helpText, 
  className,
  id,
  ...props 
}: FormInputProps) {
  return (
    <FormField error={error}>
      <FormLabel htmlFor={id} required={required}>
        {label}
      </FormLabel>
      <Input
        id={id}
        className={cn(
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        aria-describedby={helpText ? `${id}-help` : undefined}
        aria-invalid={error ? 'true' : 'false'}
        required={required}
        {...props}
      />
      {helpText && (
        <p id={`${id}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </FormField>
  );
}

// Enhanced select field with consistent styling and accessibility
interface FormSelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  id?: string;
}

export function FormSelect({ 
  label, 
  value, 
  onValueChange, 
  options, 
  placeholder, 
  error, 
  required, 
  helpText,
  id 
}: FormSelectProps) {
  return (
    <FormField error={error}>
      <FormLabel htmlFor={id} required={required}>
        {label}
      </FormLabel>
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger 
          className={cn(
            "w-full h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm",
            "placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500",
            "hover:border-gray-400 transition-colors",
            error && "border-red-500 ring-2 ring-red-500"
          )}
          aria-label={placeholder}
          aria-describedby={helpText ? `${id}-help` : undefined}
          aria-invalid={error ? 'true' : 'false'}
        >
          <SelectValue 
            placeholder={placeholder}
            className="text-gray-900 placeholder:text-gray-500"
          />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="px-3 py-2 text-sm text-gray-900 hover:bg-red-50 hover:text-red-900 focus:bg-red-50 focus:text-red-900 cursor-pointer"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helpText && (
        <p id={`${id}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </FormField>
  );
}

// Grid layout for form fields
interface FormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FormGrid({ children, columns = 2, className }: FormGridProps) {
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2", 
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-4"
  }[columns];

  return (
    <div className={cn("grid gap-4", gridClass, className)}>
      {children}
    </div>
  );
}

// Form section with heading
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

// Textarea field component
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
}

export function FormTextarea({ 
  label, 
  error, 
  required, 
  helpText, 
  className,
  id,
  ...props 
}: FormTextareaProps) {
  return (
    <FormField error={error}>
      <FormLabel htmlFor={id} required={required}>
        {label}
      </FormLabel>
      <textarea
        id={id}
        className={cn(
          "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-4 py-3",
          "text-tablet-base font-ui shadow-sm placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-krong-red focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation resize-y",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        aria-describedby={helpText ? `${id}-help` : undefined}
        aria-invalid={error ? 'true' : 'false'}
        required={required}
        {...props}
      />
      {helpText && (
        <p id={`${id}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </FormField>
  );
}