import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const listVariants = cva("", {
  variants: {
    variant: {
      default: "space-y-1",
      dense: "space-y-0.5",
      relaxed: "space-y-2",
      divided: "divide-y divide-border",
    },
    orientation: {
      vertical: "flex flex-col",
      horizontal: "flex flex-row gap-4",
    },
  },
  defaultVariants: {
    variant: "default",
    orientation: "vertical",
  },
})

export interface ListProps
  extends React.HTMLAttributes<HTMLUListElement | HTMLOListElement>,
    VariantProps<typeof listVariants> {
  ordered?: boolean
}

const List = React.forwardRef<
  HTMLUListElement | HTMLOListElement,
  ListProps
>(({ className, variant, orientation, ordered = false, ...props }, ref) => {
  const Comp = ordered ? "ol" : "ul"
  return (
    <Comp
      ref={ref as any}
      className={cn(listVariants({ variant, orientation, className }))}
      {...props}
    />
  )
})
List.displayName = "List"

const ListItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement> & {
    variant?: "default" | "card" | "interactive"
  }
>(({ className, variant = "default", children, ...props }, ref) => {
  const itemVariants = {
    default: "",
    card: "rounded-lg border bg-card p-4 shadow-sm",
    interactive: "rounded-lg p-2 transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer",
  }

  return (
    <li
      ref={ref}
      className={cn(itemVariants[variant], className)}
      {...props}
    >
      {children}
    </li>
  )
})
ListItem.displayName = "ListItem"

const ListItemContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center space-x-3", className)}
    {...props}
  />
))
ListItemContent.displayName = "ListItemContent"

const ListItemIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-shrink-0", className)}
    {...props}
  />
))
ListItemIcon.displayName = "ListItemIcon"

const ListItemText = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 min-w-0", className)}
    {...props}
  />
))
ListItemText.displayName = "ListItemText"

const ListItemTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h4
    ref={ref}
    className={cn("text-sm font-medium leading-none", className)}
    {...props}
  />
))
ListItemTitle.displayName = "ListItemTitle"

const ListItemDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
))
ListItemDescription.displayName = "ListItemDescription"

const ListItemActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center space-x-1", className)}
    {...props}
  />
))
ListItemActions.displayName = "ListItemActions"

export {
  List,
  ListItem,
  ListItemContent,
  ListItemIcon,
  ListItemText,
  ListItemTitle,
  ListItemDescription,
  ListItemActions,
}