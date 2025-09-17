import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { Loader2, Search, Eye, EyeOff, AlertCircle } from 'lucide-react'

const inputVariants = cva(
  'flex w-full rounded-md border bg-background text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-success-500 focus-visible:ring-success-500',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 py-2',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  loading?: boolean
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onPasswordToggle?: () => void
  showPassword?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    variant,
    size,
    loading,
    error,
    leftIcon,
    rightIcon,
    onPasswordToggle,
    showPassword,
    disabled,
    ...props
  }, ref) => {
    const inputType = type === 'password' && showPassword ? 'text' : type
    const hasError = error || variant === 'error'

    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-0 top-0 flex h-full items-center pl-3 pointer-events-none">
            <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
              {leftIcon}
            </span>
          </div>
        )}

        <input
          type={inputType}
          className={cn(
            inputVariants({ variant: hasError ? 'error' : variant, size, className }),
            leftIcon && 'pl-10',
            (rightIcon || loading || type === 'password') && 'pr-10'
          )}
          ref={ref}
          disabled={disabled || loading}
          aria-invalid={!!hasError}
          aria-describedby={error ? 'input-error' : undefined}
          {...props}
        />

        {type === 'search' && !rightIcon && !loading && (
          <div className="absolute right-0 top-0 flex h-full items-center pr-3 pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {type === 'password' && !loading && (
          <button
            type="button"
            onClick={onPasswordToggle}
            className="absolute right-0 top-0 flex h-full items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}

        {loading && (
          <div className="absolute right-0 top-0 flex h-full items-center pr-3 pointer-events-none">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {rightIcon && !loading && type !== 'password' && (
          <div className="absolute right-0 top-0 flex h-full items-center pr-3 pointer-events-none">
            <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
              {rightIcon}
            </span>
          </div>
        )}

        {error && (
          <div id="input-error" className="mt-1 flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input, inputVariants }