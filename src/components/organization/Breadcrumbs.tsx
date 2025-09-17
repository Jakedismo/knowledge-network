"use client"
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  separator?: React.ReactNode
}

export function Breadcrumbs({ items, className, separator = <span className="mx-2" aria-hidden>›</span> }: BreadcrumbsProps) {
  return (
    <nav className={cn('text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          const content = item.href && !isLast ? (
            <a href={item.href} className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
              {item.label}
            </a>
          ) : (
            <span aria-current={isLast ? 'page' : undefined} className={cn(isLast && 'font-medium')}>{item.label}</span>
          )
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center">
              {content}
              {!isLast && separator}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

