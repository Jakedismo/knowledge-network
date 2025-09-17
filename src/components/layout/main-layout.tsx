"use client"

import * as React from "react"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { cn } from "@/lib/utils"

interface MainLayoutProps {
  children: React.ReactNode
  className?: string
  sidebarCollapsed?: boolean
  onSidebarToggle?: () => void
}

export function MainLayout({
  children,
  className,
  sidebarCollapsed = false,
  onSidebarToggle,
}: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(sidebarCollapsed)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false)

  const handleSidebarToggle = React.useCallback(() => {
    if (onSidebarToggle) {
      onSidebarToggle()
    } else {
      setIsSidebarCollapsed(prev => !prev)
    }
  }, [onSidebarToggle])

  const handleMobileSidebarToggle = React.useCallback(() => {
    setIsMobileSidebarOpen(prev => !prev)
  }, [])

  return (
    <div className={cn("min-h-screen bg-background font-sans antialiased", className)}>
      <Header className="lg:pl-64" />

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-background lg:pt-14">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={handleSidebarToggle} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleMobileSidebarToggle}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-background shadow-xl">
            <div className="h-14 border-b" />
            <Sidebar isCollapsed={false} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        "lg:pl-64",
        "pt-14", // Account for fixed header
        "min-h-screen"
      )}>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}