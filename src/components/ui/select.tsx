"use client"
import * as React from 'react'
import * as RSelect from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

export interface SelectOption { label: string; value: string }

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  options: SelectOption[]
  className?: string
}

export function Select({ value, onValueChange, placeholder = 'Select…', options, className }: SelectProps) {
  return (
    <RSelect.Root {...(value !== undefined && value !== null ? { value } : {})} onValueChange={onValueChange}> 
      <RSelect.Trigger className={cn('inline-flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm w-full', className)} aria-label="Select">
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon aria-hidden>▾</RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content className="z-50 rounded-md border bg-popover shadow-md">
          <RSelect.Viewport className="p-1 max-h-60 overflow-auto">
            {options.map((opt) => (
              <RSelect.Item key={opt.value} value={opt.value} className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent">
                <RSelect.ItemText>{opt.label}</RSelect.ItemText>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  )
}
