import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { Circle } from 'lucide-react'

const radioGroupVariants = cva(
  'grid gap-2',
  {
    variants: {
      layout: {
        vertical: 'grid-cols-1',
        horizontal: 'flex flex-row flex-wrap',
      },
    },
    defaultVariants: {
      layout: 'vertical',
    },
  }
)

const radioItemVariants = cva(
  'aspect-square h-4 w-4 rounded-full border ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-primary text-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary',
        secondary: 'border-secondary text-secondary data-[state=checked]:bg-secondary data-[state=checked]:border-secondary',
        destructive: 'border-destructive text-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive',
        success: 'border-success-500 text-success-500 data-[state=checked]:bg-success-500 data-[state=checked]:border-success-500',
        outline: 'border-input data-[state=checked]:border-primary data-[state=checked]:text-primary',
      },
      size: {
        sm: 'h-3 w-3',
        default: 'h-4 w-4',
        lg: 'h-5 w-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>,
    VariantProps<typeof radioGroupVariants> {}

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ className, layout, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn(radioGroupVariants({ layout }), className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

export interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
    VariantProps<typeof radioItemVariants> {
  hideIndicator?: boolean
}

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, variant, size, hideIndicator = false, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(radioItemVariants({ variant, size }), className)}
      {...props}
    >
      {!hideIndicator && (
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="h-2.5 w-2.5 fill-current text-current" />
        </RadioGroupPrimitive.Indicator>
      )}
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

// Compound component for radio with label
export interface RadioGroupOptionProps
  extends Omit<RadioGroupItemProps, 'id'> {
  label: React.ReactNode
  description?: React.ReactNode
  id?: string
}

const RadioGroupOption = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupOptionProps
>(({ label, description, id, className, ...props }, ref) => {
  const generatedId = React.useId()
  const itemId = id || generatedId

  return (
    <div className="flex items-start space-x-2">
      <RadioGroupItem ref={ref} id={itemId} className="mt-0.5" {...props} />
      <label
        htmlFor={itemId}
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
RadioGroupOption.displayName = 'RadioGroupOption'

// Card-style radio option
export interface RadioGroupCardProps
  extends Omit<RadioGroupItemProps, 'id'> {
  label: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  id?: string
}

const RadioGroupCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupCardProps
>(({ label, description, icon, id, className, variant, size, ...props }, ref) => {
  const generatedId = React.useId()
  const itemId = id || generatedId

  return (
    <div className="relative">
      <RadioGroupItem
        ref={ref}
        id={itemId}
        className="absolute top-4 right-4"
        variant={variant}
        size={size}
        {...props}
      />
      <label
        htmlFor={itemId}
        className={cn(
          'flex cursor-pointer rounded-lg border bg-card p-4 hover:bg-accent hover:text-accent-foreground transition-colors',
          'has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/20',
          'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
          className
        )}
      >
        <div className="flex-1 space-y-1">
          {icon && (
            <div className="mb-2 text-muted-foreground [&>svg]:h-5 [&>svg]:w-5">
              {icon}
            </div>
          )}
          <p className="font-medium leading-none">{label}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </label>
    </div>
  )
})
RadioGroupCard.displayName = 'RadioGroupCard'

export {
  RadioGroup,
  RadioGroupItem,
  RadioGroupOption,
  RadioGroupCard,
  radioGroupVariants,
  radioItemVariants,
}