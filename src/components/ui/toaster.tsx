'use client'

import { Toaster as Sonner } from 'sonner'
import { useTheme } from 'next-themes'

type ToasterProps = React.ComponentProps<typeof Sonner>

export function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={(theme as 'light' | 'dark' | 'system') || 'system'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          error: 'group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive/50',
          success: 'group-[.toaster]:bg-success-50 group-[.toaster]:text-success-700 group-[.toaster]:border-success-200 dark:group-[.toaster]:bg-success-500/10 dark:group-[.toaster]:text-success-400 dark:group-[.toaster]:border-success-500/30',
          warning: 'group-[.toaster]:bg-warning-50 group-[.toaster]:text-warning-700 group-[.toaster]:border-warning-200 dark:group-[.toaster]:bg-warning-500/10 dark:group-[.toaster]:text-warning-400 dark:group-[.toaster]:border-warning-500/30',
          info: 'group-[.toaster]:bg-info-50 group-[.toaster]:text-info-700 group-[.toaster]:border-info-200 dark:group-[.toaster]:bg-info-500/10 dark:group-[.toaster]:text-info-400 dark:group-[.toaster]:border-info-500/30',
        },
      }}
      {...props}
    />
  )
}