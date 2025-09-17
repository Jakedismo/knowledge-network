/**
 * Theme Toggle Component
 *
 * A beautiful theme toggle button with smooth animations and
 * support for light/dark/system themes.
 */

'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from './button'
import { useTheme } from '@/lib/theme-provider'
import { cn } from '@/lib/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'simple'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function ThemeToggle({ variant = 'button', size = 'default', className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" size={size === 'default' ? 'icon' : size} className={className}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (variant === 'simple') {
    return (
      <Button
        variant="ghost"
        size={size === 'default' ? 'icon' : size}
        onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
        className={className}
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  // Default button variant with current theme indicator
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="outline"
        size={size === 'default' ? 'icon' : size}
        onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
        className="relative"
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      {/* Theme indicator dots */}
      <div className="flex gap-1">
        <button
          onClick={() => setTheme('light')}
          className={cn(
            'h-2 w-2 rounded-full transition-all duration-200',
            theme === 'light'
              ? 'bg-primary ring-2 ring-primary/30'
              : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
          )}
          aria-label="Light theme"
        />
        <button
          onClick={() => setTheme('dark')}
          className={cn(
            'h-2 w-2 rounded-full transition-all duration-200',
            theme === 'dark'
              ? 'bg-primary ring-2 ring-primary/30'
              : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
          )}
          aria-label="Dark theme"
        />
        <button
          onClick={() => setTheme('system')}
          className={cn(
            'h-2 w-2 rounded-full transition-all duration-200',
            theme === 'system'
              ? 'bg-primary ring-2 ring-primary/30'
              : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
          )}
          aria-label="System theme"
        />
      </div>
    </div>
  )
}

// Advanced theme toggle with labels
interface ThemeToggleAdvancedProps {
  showLabel?: boolean
  showSystemOption?: boolean
  className?: string
}

export function ThemeToggleAdvanced({
  showLabel = false,
  showSystemOption = true,
  className
}: ThemeToggleAdvancedProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themes = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    ...(showSystemOption ? [{ key: 'system', label: 'System', icon: Monitor }] : []),
  ] as const

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">
          Theme:
        </span>
      )}

      <div className="flex items-center rounded-lg border bg-background p-1">
        {themes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTheme(key as any)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              theme === key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Floating theme toggle for corner placement
export function ThemeToggleFloating({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
      className={cn(
        'fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg transition-all hover:scale-105',
        className
      )}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
