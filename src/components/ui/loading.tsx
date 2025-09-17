import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const loadingVariants = cva("inline-block", {
  variants: {
    variant: {
      spinner: "animate-spin rounded-full border-2 border-current border-t-transparent",
      dots: "flex space-x-1 items-center",
      pulse: "animate-pulse rounded",
      skeleton: "animate-pulse rounded bg-muted",
      bars: "flex space-x-1 items-center",
    },
    size: {
      sm: "",
      md: "",
      lg: "",
      xl: "",
    },
  },
  compoundVariants: [
    {
      variant: "spinner",
      size: "sm",
      class: "h-4 w-4",
    },
    {
      variant: "spinner",
      size: "md",
      class: "h-6 w-6",
    },
    {
      variant: "spinner",
      size: "lg",
      class: "h-8 w-8",
    },
    {
      variant: "spinner",
      size: "xl",
      class: "h-12 w-12",
    },
  ],
  defaultVariants: {
    variant: "spinner",
    size: "md",
  },
})

export interface LoadingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {
  text?: string
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, variant, size, text, ...props }, ref) => {
    const renderContent = () => {
      switch (variant) {
        case "dots":
          return (
            <div className="flex space-x-1 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "bg-current rounded-full animate-pulse",
                    size === "sm" && "h-1 w-1",
                    size === "md" && "h-1.5 w-1.5",
                    size === "lg" && "h-2 w-2",
                    size === "xl" && "h-3 w-3"
                  )}
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          )

        case "bars":
          return (
            <div className="flex space-x-1 items-center">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "bg-current animate-pulse",
                    size === "sm" && "h-4 w-1",
                    size === "md" && "h-6 w-1",
                    size === "lg" && "h-8 w-1.5",
                    size === "xl" && "h-12 w-2"
                  )}
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: "0.8s",
                  }}
                />
              ))}
            </div>
          )

        case "pulse":
          return (
            <div
              className={cn(
                "bg-muted rounded",
                size === "sm" && "h-4 w-16",
                size === "md" && "h-6 w-24",
                size === "lg" && "h-8 w-32",
                size === "xl" && "h-12 w-48"
              )}
            />
          )

        case "skeleton":
          return (
            <div
              className={cn(
                "bg-muted rounded",
                size === "sm" && "h-4 w-full",
                size === "md" && "h-6 w-full",
                size === "lg" && "h-8 w-full",
                size === "xl" && "h-12 w-full"
              )}
            />
          )

        default: // spinner
          return <div className={cn(loadingVariants({ variant, size }))} />
      }
    }

    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center gap-2", className)}
        {...props}
      >
        {renderContent()}
        {text && (
          <span className={cn(
            "text-muted-foreground",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base",
            size === "xl" && "text-lg"
          )}>
            {text}
          </span>
        )}
      </div>
    )
  }
)
Loading.displayName = "Loading"

// Skeleton components for more complex loading states
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("animate-pulse rounded-md bg-muted", className)}
    {...props}
  />
))
Skeleton.displayName = "Skeleton"

// Loading overlay for content areas
const LoadingOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isLoading?: boolean
    children: React.ReactNode
    loadingText?: string
  }
>(({ className, isLoading = false, children, loadingText, ...props }, ref) => (
  <div ref={ref} className={cn("relative", className)} {...props}>
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <Loading text={loadingText ?? "Loading..."} />
      </div>
    )}
  </div>
))
LoadingOverlay.displayName = "LoadingOverlay"

export { Loading, Skeleton, LoadingOverlay }