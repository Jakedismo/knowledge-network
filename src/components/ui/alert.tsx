import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        destructive: 'bg-destructive/10 text-destructive border-destructive/30 dark:border-destructive/50',
        warning: 'bg-warning-50 text-warning-900 border-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/30',
        success: 'bg-success-50 text-success-900 border-success-200 dark:bg-success-500/10 dark:text-success-400 dark:border-success-500/30',
        info: 'bg-info-50 text-info-900 border-info-200 dark:bg-info-500/10 dark:text-info-400 dark:border-info-500/30',
      },
      size: {
        sm: 'px-3 py-2 text-xs',
        default: 'px-4 py-3 text-sm',
        lg: 'px-6 py-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, size, icon, dismissible, onDismiss, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true)

    const handleDismiss = () => {
      setIsVisible(false)
      onDismiss?.()
    }

    if (!isVisible && dismissible) return null

    const defaultIcons = {
      default: <AlertCircle className="h-4 w-4" />,
      destructive: <AlertCircle className="h-4 w-4" />,
      warning: <AlertTriangle className="h-4 w-4" />,
      success: <CheckCircle className="h-4 w-4" />,
      info: <Info className="h-4 w-4" />,
    }

    const alertIcon = icon !== undefined ? icon : defaultIcons[variant || 'default']

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant, size }), className)}
        {...props}
      >
        {alertIcon && (
          <div className="absolute left-4 top-3.5 text-current">
            {alertIcon}
          </div>
        )}
        <div className={cn(alertIcon && 'pl-7', dismissible && 'pr-8')}>
          {children}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-md p-1 text-current/50 hover:text-current transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed opacity-90', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

// Additional compound component for actions
const AlertActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('mt-3 flex gap-2', className)}
    {...props}
  />
))
AlertActions.displayName = 'AlertActions'

export { Alert, AlertTitle, AlertDescription, AlertActions, alertVariants }