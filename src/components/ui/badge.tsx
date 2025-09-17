import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { X } from 'lucide-react'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        success: 'bg-success-500/10 text-success-700 dark:text-success-400 border border-success-500/20',
        warning: 'bg-warning-500/10 text-warning-700 dark:text-warning-400 border border-warning-500/20',
        info: 'bg-info-500/10 text-info-700 dark:text-info-400 border border-info-500/20',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        sm: 'px-2 py-0 text-[10px]',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
      rounded: {
        default: 'rounded-full',
        sm: 'rounded-md',
        lg: 'rounded-lg',
        none: 'rounded-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean
  onRemove?: () => void
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, rounded, removable, onRemove, leftIcon, rightIcon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, rounded }), className)}
        {...props}
      >
        {leftIcon && (
          <span className="[&>svg]:h-3 [&>svg]:w-3">
            {leftIcon}
          </span>
        )}
        {children}
        {rightIcon && !removable && (
          <span className="[&>svg]:h-3 [&>svg]:w-3">
            {rightIcon}
          </span>
        )}
        {removable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove?.()
            }}
            className="ml-0.5 -mr-1 inline-flex h-3 w-3 items-center justify-center rounded-full hover:bg-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            aria-label="Remove badge"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    )
  }
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }