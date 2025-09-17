"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Search,
  FileText,
  Users,
  BarChart3,
  Settings,
  Plus,
  ChevronDown,
  Folder,
  Tag,
  type LucideIcon
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
}

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Search",
    href: "/search",
    icon: Search,
  },
  {
    title: "Knowledge Base",
    href: "/knowledge",
    icon: FileText,
    children: [
      {
        title: "All Documents",
        href: "/knowledge/documents",
        icon: FileText,
      },
      {
        title: "Collections",
        href: "/knowledge/collections",
        icon: Folder,
      },
      {
        title: "Tags",
        href: "/knowledge/tags",
        icon: Tag,
      },
    ],
  },
  {
    title: "Collaboration",
    href: "/collaboration",
    icon: Users,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar({ className, isCollapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = React.useState<string[]>([])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const isExpanded = (href: string) => expandedItems.includes(href)
  const isActive = (href: string) => pathname === href || pathname.startsWith(href)

  return (
    <div className={cn(
      "flex h-full flex-col border-r bg-background",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4">
        {!isCollapsed && (
          <>
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded bg-primary" />
              <span className="font-semibold">Knowledge Network</span>
            </div>
          </>
        )}
        {isCollapsed && (
          <div className="h-6 w-6 rounded bg-primary mx-auto" />
        )}
      </div>

      {/* Quick Actions */}
      {!isCollapsed && (
        <div className="p-4">
          <Button className="w-full justify-start" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            isActive={isActive}
            isExpanded={isExpanded}
            onToggleExpanded={toggleExpanded}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground">
            <div>Version 1.0.0</div>
            <div>© 2024 Knowledge Network</div>
          </div>
        )}
      </div>
    </div>
  )
}

interface NavItemComponentProps {
  item: NavItem
  isActive: (href: string) => boolean
  isExpanded: (href: string) => boolean
  onToggleExpanded: (href: string) => void
  isCollapsed: boolean
  level?: number
}

function NavItemComponent({
  item,
  isActive,
  isExpanded,
  onToggleExpanded,
  isCollapsed,
  level = 0
}: NavItemComponentProps) {
  const hasChildren = item.children && item.children.length > 0
  const isItemExpanded = isExpanded(item.href)
  const isItemActive = isActive(item.href)

  const handleClick = () => {
    if (hasChildren && !isCollapsed) {
      onToggleExpanded(item.href)
    }
  }

  return (
    <div>
      <div className="relative">
        {hasChildren && !isCollapsed ? (
          <button
            onClick={handleClick}
            className={cn(
              "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              isItemActive && "bg-accent text-accent-foreground",
              level > 0 && "ml-4 w-[calc(100%-1rem)]"
            )}
          >
            <div className="flex items-center">
              <item.icon className="mr-3 h-4 w-4" />
              <span>{item.title}</span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isItemExpanded && "transform rotate-180"
              )}
            />
          </button>
        ) : (
          <Link
            href={item.href}
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              isItemActive && "bg-accent text-accent-foreground",
              level > 0 && "ml-4",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? item.title : undefined}
          >
            <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
            {!isCollapsed && <span>{item.title}</span>}
            {item.badge && !isCollapsed && (
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        )}
      </div>

      {/* Children */}
      {hasChildren && isItemExpanded && !isCollapsed && (
        <div className="mt-1 space-y-1">
          {item.children?.map((child) => (
            <NavItemComponent
              key={child.href}
              item={child}
              isActive={isActive}
              isExpanded={isExpanded}
              onToggleExpanded={onToggleExpanded}
              isCollapsed={isCollapsed}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}