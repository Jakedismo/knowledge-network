/**
 * Layout Components for Knowledge Network
 *
 * Comprehensive layout components including containers, sections,
 * flex layouts, and specialized layout patterns.
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

// Container Component
const containerVariants = cva(
  'mx-auto w-full px-4 sm:px-6 lg:px-8',
  {
    variants: {
      size: {
        sm: 'max-w-3xl',
        md: 'max-w-5xl',
        lg: 'max-w-7xl',
        xl: 'max-w-screen-xl',
        '2xl': 'max-w-screen-2xl',
        full: 'max-w-full',
        none: 'max-w-none',
      },
      padding: {
        none: 'px-0',
        sm: 'px-4',
        md: 'px-6',
        lg: 'px-8',
        xl: 'px-12',
      },
    },
    defaultVariants: {
      size: 'lg',
      padding: 'md',
    },
  }
)

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: React.ElementType
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(containerVariants({ size, padding, className }))}
        {...props}
      />
    )
  }
)
Container.displayName = 'Container'

// Section Component
const sectionVariants = cva(
  'w-full',
  {
    variants: {
      spacing: {
        none: '',
        sm: 'py-8',
        md: 'py-12',
        lg: 'py-16',
        xl: 'py-20',
        '2xl': 'py-24',
      },
      background: {
        none: '',
        muted: 'bg-muted/50',
        card: 'bg-card',
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
      },
    },
    defaultVariants: {
      spacing: 'md',
      background: 'none',
    },
  }
)

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  as?: React.ElementType
  contained?: boolean
  containerSize?: ContainerProps['size']
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({
    className,
    spacing,
    background,
    contained = true,
    containerSize = 'lg',
    as: Component = 'section',
    children,
    ...props
  }, ref) => {
    const content = contained ? (
      <Container size={containerSize}>{children}</Container>
    ) : (
      children
    )

    return (
      <Component
        ref={ref}
        className={cn(sectionVariants({ spacing, background, className }))}
        {...props}
      >
        {content}
      </Component>
    )
  }
)
Section.displayName = 'Section'

// Flex Component
const flexVariants = cva(
  'flex',
  {
    variants: {
      direction: {
        row: 'flex-row',
        'row-reverse': 'flex-row-reverse',
        col: 'flex-col',
        'col-reverse': 'flex-col-reverse',
      },
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      },
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
      wrap: {
        wrap: 'flex-wrap',
        'wrap-reverse': 'flex-wrap-reverse',
        nowrap: 'flex-nowrap',
      },
      gap: {
        0: 'gap-0',
        1: 'gap-1',
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
        5: 'gap-5',
        6: 'gap-6',
        8: 'gap-8',
        10: 'gap-10',
        12: 'gap-12',
      },
    },
    defaultVariants: {
      direction: 'row',
      align: 'center',
      justify: 'start',
      wrap: 'nowrap',
      gap: 0,
    },
  }
)

export interface FlexProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {
  as?: React.ElementType
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ className, direction, align, justify, wrap, gap, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(flexVariants({ direction, align, justify, wrap, gap, className }))}
        {...props}
      />
    )
  }
)
Flex.displayName = 'Flex'

// Stack Component (shorthand for flex column)
interface StackProps extends Omit<FlexProps, 'direction'> {
  spacing?: FlexProps['gap']
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ spacing, gap, ...props }, ref) => {
    return (
      <Flex
        ref={ref}
        direction="col"
        gap={spacing || gap}
        {...props}
      />
    )
  }
)
Stack.displayName = 'Stack'

// HStack Component (shorthand for flex row)
interface HStackProps extends Omit<FlexProps, 'direction'> {
  spacing?: FlexProps['gap']
}

const HStack = React.forwardRef<HTMLDivElement, HStackProps>(
  ({ spacing, gap, ...props }, ref) => {
    return (
      <Flex
        ref={ref}
        direction="row"
        gap={spacing || gap}
        {...props}
      />
    )
  }
)
HStack.displayName = 'HStack'

// Center Component
interface CenterProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
  inline?: boolean
}

const Center = React.forwardRef<HTMLDivElement, CenterProps>(
  ({ className, as: Component = 'div', inline = false, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          inline ? 'inline-flex' : 'flex',
          'items-center justify-center',
          className
        )}
        {...props}
      />
    )
  }
)
Center.displayName = 'Center'

// Spacer Component
interface SpacerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  axis?: 'x' | 'y' | 'both'
}

const Spacer: React.FC<SpacerProps> = ({ size = 'md', axis = 'y' }) => {
  const sizeMap = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
  }

  const spacing = sizeMap[size]

  if (axis === 'x') {
    return <div className={`w-${spacing}`} />
  }

  if (axis === 'y') {
    return <div className={`h-${spacing}`} />
  }

  return <div className={`w-${spacing} h-${spacing}`} />
}

// AspectRatio Component
interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number
  as?: React.ElementType
}

const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ className, ratio = 16 / 9, as: Component = 'div', children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('relative w-full', className)}
        style={{ aspectRatio: ratio }}
        {...props}
      >
        <div className="absolute inset-0">
          {children}
        </div>
      </Component>
    )
  }
)
AspectRatio.displayName = 'AspectRatio'

// Divider Component
const dividerVariants = cva(
  'border-border',
  {
    variants: {
      orientation: {
        horizontal: 'w-full border-t',
        vertical: 'h-full border-l',
      },
      size: {
        sm: '',
        md: '',
        lg: 'border-2',
      },
      variant: {
        solid: '',
        dashed: 'border-dashed',
        dotted: 'border-dotted',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
      size: 'sm',
      variant: 'solid',
    },
  }
)

export interface DividerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dividerVariants> {
  label?: string
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation, size, variant, label, ...props }, ref) => {
    if (label) {
      return (
        <div
          ref={ref}
          className={cn(
            'relative flex items-center',
            orientation === 'vertical' ? 'flex-col' : 'flex-row',
            className
          )}
          {...props}
        >
          <div className={cn(dividerVariants({ orientation, size, variant }), 'flex-1')} />
          <div className="mx-3 text-sm text-muted-foreground">{label}</div>
          <div className={cn(dividerVariants({ orientation, size, variant }), 'flex-1')} />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(dividerVariants({ orientation, size, variant, className }))}
        {...props}
      />
    )
  }
)
Divider.displayName = 'Divider'

// Layout Utility Components
const Box = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }>(
  ({ as: Component = 'div', ...props }, ref) => {
    return <Component ref={ref} {...props} />
  }
)
Box.displayName = 'Box'

export {
  Container,
  Section,
  Flex,
  Stack,
  HStack,
  Center,
  Spacer,
  AspectRatio,
  Divider,
  Box,
  containerVariants,
  sectionVariants,
  flexVariants,
  dividerVariants,
}