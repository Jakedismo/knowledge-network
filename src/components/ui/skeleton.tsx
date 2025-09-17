import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const skeletonVariants = cva(
  'animate-pulse rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        light: 'bg-muted/50',
        dark: 'bg-muted-foreground/10',
        gradient: 'bg-gradient-to-r from-muted via-muted/50 to-muted',
      },
      animation: {
        pulse: 'animate-pulse',
        wave: 'overflow-hidden relative after:absolute after:inset-0 after:translate-x-[-100%] after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent',
        none: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      animation: 'pulse',
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number
  height?: string | number
  shape?: 'rectangle' | 'circle' | 'rounded'
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, animation, width, height, shape = 'rectangle', style, ...props }, ref) => {
    const shapeClasses = {
      rectangle: '',
      circle: 'rounded-full',
      rounded: 'rounded-lg',
    }

    return (
      <div
        ref={ref}
        className={cn(
          skeletonVariants({ variant, animation }),
          shapeClasses[shape],
          className
        )}
        style={{
          width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
          height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
          ...style,
        }}
        aria-busy="true"
        aria-live="polite"
        {...props}
      />
    )
  }
)
Skeleton.displayName = 'Skeleton'

// Preset skeleton components for common use cases
export interface SkeletonTextProps extends Omit<SkeletonProps, 'height'> {
  lines?: number
  lineHeight?: number
  spacing?: number
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 3, lineHeight = 16, spacing = 8, width = '100%', className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            width={index === lines - 1 ? '60%' : width}
            height={lineHeight}
            {...props}
          />
        ))}
      </div>
    )
  }
)
SkeletonText.displayName = 'SkeletonText'

export interface SkeletonCardProps extends SkeletonProps {
  showImage?: boolean
  showTitle?: boolean
  showDescription?: boolean
  showActions?: boolean
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({
    showImage = true,
    showTitle = true,
    showDescription = true,
    showActions = false,
    className,
    ...props
  }, ref) => {
    return (
      <div ref={ref} className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
        {showImage && (
          <Skeleton width="100%" height={200} shape="rounded" {...props} />
        )}
        {showTitle && (
          <Skeleton width="60%" height={24} {...props} />
        )}
        {showDescription && (
          <SkeletonText lines={2} {...props} />
        )}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Skeleton width={80} height={32} shape="rounded" {...props} />
            <Skeleton width={80} height={32} shape="rounded" {...props} />
          </div>
        )}
      </div>
    )
  }
)
SkeletonCard.displayName = 'SkeletonCard'

export interface SkeletonAvatarProps extends SkeletonProps {
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
  showStatus?: boolean
}

const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ size = 'default', showStatus = false, className, ...props }, ref) => {
    const sizes = {
      xs: 24,
      sm: 32,
      default: 40,
      lg: 48,
      xl: 56,
    }

    return (
      <div ref={ref} className="relative inline-block">
        <Skeleton
          width={sizes[size]}
          height={sizes[size]}
          shape="circle"
          className={className}
          {...props}
        />
        {showStatus && (
          <Skeleton
            width={sizes[size] / 4}
            height={sizes[size] / 4}
            shape="circle"
            className="absolute bottom-0 right-0 ring-2 ring-background"
            {...props}
          />
        )}
      </div>
    )
  }
)
SkeletonAvatar.displayName = 'SkeletonAvatar'

export interface SkeletonTableProps extends SkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
}

const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ rows = 5, columns = 4, showHeader = true, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('w-full space-y-2', className)}>
        {showHeader && (
          <div className="flex gap-4 pb-2 border-b">
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={index} width="100%" height={20} {...props} />
            ))}
          </div>
        )}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} width="100%" height={16} {...props} />
            ))}
          </div>
        ))}
      </div>
    )
  }
)
SkeletonTable.displayName = 'SkeletonTable'

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonTable,
  skeletonVariants,
}