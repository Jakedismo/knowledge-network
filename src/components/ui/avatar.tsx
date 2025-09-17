import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { User } from 'lucide-react'
import Image from 'next/image'

const avatarVariants = cva(
  'relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-[10px]',
        sm: 'h-8 w-8 text-xs',
        default: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-14 w-14 text-lg',
        '2xl': 'h-16 w-16 text-xl',
      },
      variant: {
        default: 'bg-muted text-muted-foreground',
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-success-500 text-white',
        warning: 'bg-warning-500 text-white',
        destructive: 'bg-destructive text-destructive-foreground',
        gradient: 'bg-gradient-to-br from-primary to-secondary text-white',
      },
      shape: {
        circle: 'rounded-full',
        square: 'rounded-lg',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
      shape: 'circle',
    },
  }
)

const avatarStatusVariants = cva(
  'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
  {
    variants: {
      size: {
        xs: 'h-1.5 w-1.5',
        sm: 'h-2 w-2',
        default: 'h-2.5 w-2.5',
        lg: 'h-3 w-3',
        xl: 'h-3.5 w-3.5',
        '2xl': 'h-4 w-4',
      },
      status: {
        online: 'bg-success-500',
        offline: 'bg-muted',
        busy: 'bg-destructive',
        away: 'bg-warning-500',
      },
    },
    defaultVariants: {
      size: 'default',
      status: 'offline',
    },
  }
)

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string | null
  alt?: string
  fallback?: React.ReactNode
  status?: 'online' | 'offline' | 'busy' | 'away'
  showStatus?: boolean
  initials?: string
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({
    className,
    size,
    variant,
    shape,
    src,
    alt = 'Avatar',
    fallback,
    status = 'offline',
    showStatus = false,
    initials,
    children,
    ...props
  }, ref) => {
    const [imageError, setImageError] = React.useState(false)

    // Reset error state when src changes
    React.useEffect(() => {
      setImageError(false)
    }, [src])

    const renderFallback = () => {
      if (fallback) {
        return fallback
      }
      if (initials) {
        return <span className="uppercase">{initials.slice(0, 2)}</span>
      }
      if (children) {
        return children
      }
      return <User className="h-[60%] w-[60%]" />
    }

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size, variant, shape }), className)}
        role="img"
        aria-label={alt}
        {...props}
      >
        {src && !imageError ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="48px"
            onError={() => setImageError(true)}
            className="object-cover"
          />
        ) : (
          renderFallback()
        )}

        {showStatus && (
          <span
            className={cn(avatarStatusVariants({ size, status }))}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'

// Compound components for more complex avatar layouts
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number
  size?: VariantProps<typeof avatarVariants>['size']
  spacing?: 'tight' | 'normal' | 'loose'
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, max = 3, size = 'default', spacing = 'normal', ...props }, ref) => {
    const childrenArray = React.Children.toArray(children)
    const visibleChildren = max ? childrenArray.slice(0, max) : childrenArray
    const remainingCount = childrenArray.length - visibleChildren.length

    const spacingClasses = {
      tight: '-space-x-3',
      normal: '-space-x-2',
      loose: '-space-x-1',
    }

    return (
      <div
        ref={ref}
        className={cn('flex items-center', spacingClasses[spacing], className)}
        {...props}
      >
        {visibleChildren.map((child, index) =>
          React.isValidElement(child) ? (
            <div key={index} className="relative inline-block ring-2 ring-background rounded-full">
              {React.cloneElement(child as React.ReactElement<AvatarProps>, { size })}
            </div>
          ) : null
        )}
        {remainingCount > 0 && (
          <div className="relative inline-block ring-2 ring-background rounded-full">
            <Avatar
              size={size}
              variant="default"
              initials={`+${remainingCount}`}
            />
          </div>
        )}
      </div>
    )
  }
)
AvatarGroup.displayName = 'AvatarGroup'

export { Avatar, AvatarGroup, avatarVariants, avatarStatusVariants }
