"use client"

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { AlertCircle, Info } from 'lucide-react'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 inline-flex items-center gap-1',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        required: 'text-foreground after:content-["*"] after:ml-0.5 after:text-destructive',
        optional: 'text-muted-foreground',
        error: 'text-destructive',
        success: 'text-success-600 dark:text-success-400',
      },
      size: {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  required?: boolean
  optional?: boolean
  error?: boolean
  helperText?: React.ReactNode
  tooltip?: React.ReactNode
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({
  className,
  variant,
  size,
  required,
  optional,
  error,
  helperText,
  tooltip,
  children,
  ...props
}, ref) => {
  // Determine variant based on props
  let computedVariant = variant
  if (!variant) {
    if (error) computedVariant = 'error'
    else if (required) computedVariant = 'required'
    else if (optional) computedVariant = 'optional'
    else computedVariant = 'default'
  }

  return (
    <div className="space-y-1">
      <LabelPrimitive.Root
        ref={ref}
        className={cn(labelVariants({ variant: computedVariant, size }), className)}
        {...props}
      >
        {children}
        {tooltip && (
          <span className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-help">
            <Info className="h-3 w-3" />
          </span>
        )}
      </LabelPrimitive.Root>
      {helperText && (
        <p className={cn(
          'text-xs',
          error ? 'text-destructive flex items-center gap-1' : 'text-muted-foreground'
        )}>
          {error && <AlertCircle className="h-3 w-3" />}
          {helperText}
        </p>
      )}
    </div>
  )
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label, labelVariants }