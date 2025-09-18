'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Plus, FileText, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-media-query'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: number
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/dashboard' },
  { icon: Search, label: 'Search', href: '/search' },
  { icon: Plus, label: 'Create', href: '/documents/new' },
  { icon: FileText, label: 'Docs', href: '/knowledge' },
  { icon: User, label: 'Profile', href: '/profile' },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (!isMobile) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center"
            >
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-auto w-full flex-col gap-1 px-1 py-2',
                  'hover:bg-transparent hover:text-primary',
                  'focus-visible:bg-transparent focus-visible:text-primary',
                  isActive && 'text-primary'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn('text-[10px]', isActive ? 'font-semibold' : 'font-normal')}>
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
  )
}

// Add CSS variable for safe area
if (typeof window !== 'undefined') {
  const root = document.documentElement
  root.style.setProperty(
    '--safe-area-inset-bottom',
    'env(safe-area-inset-bottom, 0px)'
  )
}