"use client"

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { cva, type VariantProps } from 'class-variance-authority'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

const checkboxVariants = cva(
  'peer shrink-0 rounded border ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary',
        secondary: 'border-secondary data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground data-[state=checked]:border-secondary',
        destructive: 'border-destructive data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground data-[state=checked]:border-destructive',
        outline: 'border-input data-[state=checked]:border-primary data-[state=checked]:text-primary',
        success: 'border-success-500 data-[state=checked]:bg-success-500 data-[state=checked]:text-white data-[state=checked]:border-success-500',
      },
      size: {
        sm: 'h-3 w-3',
        default: 'h-4 w-4',
        lg: 'h-5 w-5',
        xl: 'h-6 w-6',
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'sm',
    },
  }
)

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, variant, size, rounded, indeterminate, checked, ...props }, ref) => {
  const checkboxRef = React.useRef<HTMLButtonElement>(null)

  React.useImperativeHandle(ref, () => checkboxRef.current!)

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.dataset.state = indeterminate ? 'indeterminate' : checkboxRef.current.dataset.state
    }
  }, [indeterminate])

  const iconSize = {
    sm: 'h-2.5 w-2.5',
    default: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
    xl: 'h-5 w-5',
  }

  return (
    <CheckboxPrimitive.Root
      ref={checkboxRef}
      className={cn(checkboxVariants({ variant, size, rounded }), className)}
      checked={indeterminate ? 'indeterminate' : checked ?? false}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {indeterminate ? (
          <Minus className={iconSize[size || 'default']} />
        ) : (
          <Check className={iconSize[size || 'default']} strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

// Compound component for checkbox with label
export interface CheckboxWithLabelProps extends CheckboxProps {
  label: React.ReactNode
  description?: React.ReactNode
  id?: string
}

const CheckboxWithLabel = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxWithLabelProps
>(({ label, description, id, className, ...props }, ref) => {
  const generatedId = React.useId()
  const checkboxId = id || generatedId

  return (
    <div className="flex items-start space-x-2">
      <Checkbox ref={ref} id={checkboxId} className="mt-0.5" {...props} />
      <label
        htmlFor={checkboxId}
        className={cn(
          'flex-1 text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
      >
        <span className="block">{label}</span>
        {description && (
          <span className="block mt-1 text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </label>
    </div>
  )
})
CheckboxWithLabel.displayName = 'CheckboxWithLabel'

export { Checkbox, CheckboxWithLabel, checkboxVariants }