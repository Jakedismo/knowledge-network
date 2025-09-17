/**
 * Responsive Grid System for Knowledge Network
 *
 * A comprehensive grid system built on CSS Grid and Flexbox
 * with mobile-first responsive design and consistent spacing.
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

// Grid Container Component
const gridVariants = cva(
  'grid w-full',
  {
    variants: {
      cols: {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        5: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5',
        6: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6',
        12: 'grid-cols-12',
        auto: 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
        'auto-sm': 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]',
        'auto-lg': 'grid-cols-[repeat(auto-fit,minmax(300px,1fr))]',
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
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
      },
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
    },
    defaultVariants: {
      cols: 'auto',
      gap: 4,
      align: 'stretch',
      justify: 'start',
    },
  }
)

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  as?: React.ElementType
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols, gap, align, justify, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(gridVariants({ cols, gap, align, justify, className }))}
        {...props}
      />
    )
  }
)
Grid.displayName = 'Grid'

// Grid Item Component
const gridItemVariants = cva(
  '',
  {
    variants: {
      colSpan: {
        1: 'col-span-1',
        2: 'col-span-2',
        3: 'col-span-3',
        4: 'col-span-4',
        5: 'col-span-5',
        6: 'col-span-6',
        7: 'col-span-7',
        8: 'col-span-8',
        9: 'col-span-9',
        10: 'col-span-10',
        11: 'col-span-11',
        12: 'col-span-12',
        full: 'col-span-full',
        auto: 'col-auto',
      },
      rowSpan: {
        1: 'row-span-1',
        2: 'row-span-2',
        3: 'row-span-3',
        4: 'row-span-4',
        5: 'row-span-5',
        6: 'row-span-6',
        full: 'row-span-full',
        auto: 'row-auto',
      },
      colStart: {
        1: 'col-start-1',
        2: 'col-start-2',
        3: 'col-start-3',
        4: 'col-start-4',
        5: 'col-start-5',
        6: 'col-start-6',
        7: 'col-start-7',
        8: 'col-start-8',
        9: 'col-start-9',
        10: 'col-start-10',
        11: 'col-start-11',
        12: 'col-start-12',
        auto: 'col-start-auto',
      },
      colEnd: {
        1: 'col-end-1',
        2: 'col-end-2',
        3: 'col-end-3',
        4: 'col-end-4',
        5: 'col-end-5',
        6: 'col-end-6',
        7: 'col-end-7',
        8: 'col-end-8',
        9: 'col-end-9',
        10: 'col-end-10',
        11: 'col-end-11',
        12: 'col-end-12',
        13: 'col-end-13',
        auto: 'col-end-auto',
      },
    },
  }
)

export interface GridItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridItemVariants> {
  as?: React.ElementType
}

const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ className, colSpan, rowSpan, colStart, colEnd, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(gridItemVariants({ colSpan, rowSpan, colStart, colEnd, className }))}
        {...props}
      />
    )
  }
)
GridItem.displayName = 'GridItem'

// Responsive Grid for specific breakpoints
interface ResponsiveGridProps extends Omit<GridProps, 'cols'> {
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
  '2xl'?: number
}

const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ className, xs = 1, sm, md, lg, xl, '2xl': xxl, ...props }, ref) => {
    const responsiveClasses = [
      `grid-cols-${xs}`,
      sm && `sm:grid-cols-${sm}`,
      md && `md:grid-cols-${md}`,
      lg && `lg:grid-cols-${lg}`,
      xl && `xl:grid-cols-${xl}`,
      xxl && `2xl:grid-cols-${xxl}`,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <Grid
        ref={ref}
        className={cn('grid w-full', responsiveClasses, className)}
        {...props}
      />
    )
  }
)
ResponsiveGrid.displayName = 'ResponsiveGrid'

// Masonry Grid for dynamic content
interface MasonryGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number
  gap?: number
  breakpointCols?: {
    default: number
    1100?: number
    700?: number
    500?: number
  }
}

const MasonryGrid = React.forwardRef<HTMLDivElement, MasonryGridProps>(
  ({ className, columns = 3, gap = 4, breakpointCols, children, ...props }, ref) => {
    const defaultBreakpoints = {
      default: columns,
      1100: Math.max(1, columns - 1),
      700: Math.max(1, columns - 2),
      500: 1,
    }

    const finalBreakpoints = breakpointCols || defaultBreakpoints

    const gapClass = `gap-${gap}`

    return (
      <div
        ref={ref}
        className={cn(
          'columns-1 sm:columns-2 lg:columns-3',
          gapClass,
          className
        )}
        style={{
          columnCount: finalBreakpoints.default,
        }}
        {...props}
      >
        {React.Children.map(children, (child, index) => (
          <div
            key={index}
            className={cn('break-inside-avoid mb-4')}
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            {child}
          </div>
        ))}
      </div>
    )
  }
)
MasonryGrid.displayName = 'MasonryGrid'

export {
  Grid,
  GridItem,
  ResponsiveGrid,
  MasonryGrid,
  gridVariants,
  gridItemVariants,
}