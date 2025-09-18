'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, Search, Bell, User, ChevronRight, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-media-query'
import { AssistantDock } from '@/components/assistant/AssistantDock'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'
import type { AssistantContext } from '@/lib/assistant/types'
import {
  primaryNavigation,
  secondaryNavigation,
  headerNavigation,
  mobileNavigation,
  getBreadcrumbs,
  type NavItem
} from '@/config/navigation'

interface AppLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  showBreadcrumbs?: boolean
  showHeader?: boolean
  assistantContext?: Partial<AssistantContext>
}

export function AppLayout({
  children,
  showSidebar = true,
  showBreadcrumbs = true,
  showHeader = true,
  assistantContext,
}: AppLayoutProps) {
  const pathname = usePathname()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')
  const { mergeContext } = useAssistantRuntime()

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [expandedItems, setExpandedItems] = React.useState<string[]>([])

  const openAssistantDock = React.useCallback(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('assistant:toggle', { detail: { open: true } }))
  }, [])

  // Auto-expand active parent items
  React.useEffect(() => {
    const activeParents = primaryNavigation
      .filter(item => item.children?.some(child => pathname.startsWith(child.path)))
      .map(item => item.id)
    setExpandedItems(activeParents)
  }, [pathname])

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Persist sidebar state in localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored) {
      setSidebarCollapsed(JSON.parse(stored))
    }
  }, [])

  React.useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const isItemActive = (item: NavItem): boolean => {
    if (pathname === item.path) return true
    if (item.children) {
      return item.children.some(child => pathname.startsWith(child.path))
    }
    return pathname.startsWith(item.path)
  }

  const breadcrumbs = React.useMemo(() => getBreadcrumbs(pathname), [pathname])
  const pageTitle = React.useMemo(
    () => (breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : undefined),
    [breadcrumbs]
  )
  const assistantContextKey = React.useMemo(
    () => (assistantContext ? JSON.stringify(assistantContext) : ''),
    [assistantContext]
  )

  React.useEffect(() => {
    mergeContext({ route: pathname, pageTitle })
  }, [mergeContext, pathname, pageTitle])

  React.useEffect(() => {
    if (!assistantContextKey) return
    mergeContext(assistantContext as AssistantContext)
  }, [assistantContextKey, assistantContext, mergeContext])

  const renderNavItem = (item: NavItem, level = 0) => {
    const isActive = isItemActive(item)
    const isExpanded = expandedItems.includes(item.id)
    const hasChildren = item.children && item.children.length > 0
    const Icon = item.icon

    const content = (
      <>
        <Icon className={cn(
          'h-4 w-4 flex-shrink-0',
          sidebarCollapsed && level === 0 ? '' : 'mr-3'
        )} />
        {(!sidebarCollapsed || level > 0) && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {item.badge}
              </span>
            )}
            {item.shortcut && !isMobile && (
              <span className="ml-auto text-xs text-muted-foreground">
                {item.shortcut}
              </span>
            )}
          </>
        )}
      </>
    )

    const className = cn(
      'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out hover:bg-accent hover:text-accent-foreground hover:shadow-sm',
      isActive && 'bg-accent text-accent-foreground',
      level > 0 && 'ml-6',
      sidebarCollapsed && level === 0 && 'justify-center px-2'
    )

    if (hasChildren && !sidebarCollapsed) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpanded(item.id)}
            className={cn(className, 'w-full justify-start')}
            title={sidebarCollapsed ? item.label : undefined}
          >
            {content}
            <ChevronRight className={cn(
              'ml-auto h-4 w-4 transition-transform duration-200 ease-in-out',
              isExpanded && 'rotate-90'
            )} />
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children?.map(child => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.id}
        href={item.path}
        className={className}
        title={sidebarCollapsed && level === 0 ? item.label : undefined}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 sm:px-6">
            {/* Mobile menu button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="mr-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}

            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary" />
              {!isMobile && (
                <span className="font-bold text-lg">Knowledge Network</span>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Header actions */}
            <div className="flex items-center space-x-2">
              {/* Global search */}
              {!isMobile && (
                <Button
                  variant="outline"
                  className="relative w-64 justify-start text-sm text-muted-foreground"
                  onClick={() => {/* Will implement GlobalSearch modal */}}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search...
                  <kbd className="pointer-events-none absolute right-2 top-2.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>
              )}

              {/* Copilot trigger */}
              <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2" onClick={openAssistantDock}>
                <Sparkles className="h-4 w-4 text-primary" />
                Copilot
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  3
                </span>
              </Button>

              {/* Profile */}
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Breadcrumbs */}
          {showBreadcrumbs && breadcrumbs.length > 1 && !isMobile && (
            <div className="flex items-center space-x-1 px-6 py-2 text-sm text-muted-foreground">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.id}>
                  {index > 0 && <ChevronRight className="h-4 w-4" />}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-foreground">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.path} className="hover:text-foreground">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </header>
      )}

      {/* Main container */}
      <div className="flex">
        {/* Sidebar - Desktop */}
        {showSidebar && !isMobile && (
          <aside className={cn(
            'sticky top-14 h-[calc(100vh-3.5rem)] border-r bg-background transition-all duration-300',
            sidebarCollapsed ? 'w-16' : 'w-64'
          )}>
            <div className="flex h-full flex-col">
              {/* Sidebar toggle */}
              <div className="flex h-12 items-center justify-end px-3 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="h-8 w-8"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 overflow-y-auto p-2">
                {/* Quick action - New Document */}
                {!sidebarCollapsed && (
                  <Link href="/editor/new">
                    <Button className="w-full justify-start mb-4" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      New Document
                    </Button>
                  </Link>
                )}

                {/* Primary nav */}
                <div className="space-y-1">
                  {primaryNavigation.map(item => renderNavItem(item))}
                </div>

                {/* Divider */}
                <div className="my-4 border-t" />

                {/* Secondary nav */}
                <div className="space-y-1">
                  {secondaryNavigation.map(item => renderNavItem(item))}
                </div>
              </nav>

              {/* Footer */}
              {!sidebarCollapsed && (
                <div className="border-t p-4">
                  <div className="text-xs text-muted-foreground">
                    <div>Version 1.0.0</div>
                    <div>© 2024 Knowledge Network</div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Mobile menu overlay */}
        {isMobile && mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
            <aside className="fixed left-0 top-0 z-50 h-full w-72 border-r bg-background">
              <div className="flex h-14 items-center justify-between px-4 border-b">
                <span className="font-bold">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="space-y-1 p-2 overflow-y-auto">
                {primaryNavigation.map(item => renderNavItem(item))}
                <div className="my-4 border-t" />
                {secondaryNavigation.map(item => renderNavItem(item))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className={cn(
          'flex-1 overflow-y-auto',
          isMobile ? 'pb-16' : ''
        )}>
          <div className="container mx-auto p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-around px-2 py-1">
            {mobileNavigation.map(item => {
              const isActive = isItemActive(item)
              const Icon = item.icon

              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className="flex flex-1 flex-col items-center justify-center"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-auto w-full flex-col gap-1 px-1 py-2',
                      'hover:bg-transparent hover:text-primary',
                      isActive && 'text-primary'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
                    <span className={cn(
                      'text-[10px]',
                      isActive ? 'font-semibold' : 'font-normal'
                    )}>
                      {item.label}
                    </span>
                  </Button>
                </Link>
              )
            })}
          </div>
          {/* Safe area for iOS */}
          <div className="h-safe-area-inset-bottom" />
        </nav>
      )}

      <AssistantDock />
    </div>
  )
}
