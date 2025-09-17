import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const separatorVariants = cva(
  'shrink-0 bg-border',
  {
    variants: {
      orientation: {
        horizontal: 'h-[1px] w-full',
        vertical: 'h-full w-[1px]',
      },
      variant: {
        default: 'bg-border',
        muted: 'bg-muted',
        primary: 'bg-primary/20',
        secondary: 'bg-secondary/20',
        dashed: 'bg-transparent',
      },
      size: {
        sm: '',
        default: '',
        lg: '',
      },
    },
    compoundVariants: [
      {
        orientation: 'horizontal',
        size: 'sm',
        className: 'h-[0.5px]',
      },
      {
        orientation: 'horizontal',
        size: 'default',
        className: 'h-[1px]',
      },
      {
        orientation: 'horizontal',
        size: 'lg',
        className: 'h-[2px]',
      },
      {
        orientation: 'vertical',
        size: 'sm',
        className: 'w-[0.5px]',
      },
      {
        orientation: 'vertical',
        size: 'default',
        className: 'w-[1px]',
      },
      {
        orientation: 'vertical',
        size: 'lg',
        className: 'w-[2px]',
      },
    ],
    defaultVariants: {
      orientation: 'horizontal',
      variant: 'default',
      size: 'default',
    },
  }
)

export interface SeparatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof separatorVariants> {
  decorative?: boolean
  asChild?: boolean
  withText?: string
  textPosition?: 'left' | 'center' | 'right'
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({
    className,
    orientation = 'horizontal',
    variant = 'default',
    size = 'default',
    decorative = true,
    withText,
    textPosition = 'center',
    ...props
  }, ref) => {
    const isDashed = variant === 'dashed'

    if (withText && orientation === 'horizontal') {
      const textAlignClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
      }

      return (
        <div
          className={cn('flex items-center gap-3 text-sm text-muted-foreground', textAlignClasses[textPosition])}
          role={decorative ? 'none' : 'separator'}
          aria-orientation={orientation || undefined}
        >
          {(textPosition === 'center' || textPosition === 'right') && (
            <div
              className={cn(
                separatorVariants({ orientation, variant: variant === 'dashed' ? 'default' : variant, size }),
                isDashed && 'border-t border-dashed border-border bg-transparent',
                'flex-1'
              )}
            />
          )}
          <span className="shrink-0 px-2">{withText}</span>
          {(textPosition === 'center' || textPosition === 'left') && (
            <div
              className={cn(
                separatorVariants({ orientation, variant: variant === 'dashed' ? 'default' : variant, size }),
                isDashed && 'border-t border-dashed border-border bg-transparent',
                'flex-1'
              )}
            />
          )}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        role={decorative ? 'none' : 'separator'}
        aria-orientation={orientation || undefined}
        className={cn(
          separatorVariants({ orientation, variant: variant === 'dashed' ? 'default' : variant, size }),
          isDashed && orientation === 'horizontal' && 'border-t border-dashed border-border bg-transparent h-0',
          isDashed && orientation === 'vertical' && 'border-l border-dashed border-border bg-transparent w-0',
          className
        )}
        {...props}
      />
    )
  }
)
Separator.displayName = 'Separator'

export { Separator, separatorVariants }