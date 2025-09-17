"use client"
import * as React from 'react'
import type { TagOption } from '@/components/organization/types'

export function useDebouncedTagSuggestions(all: TagOption[], query: string, delay = 200) {
  const [value, setValue] = React.useState<TagOption[]>(all)
  React.useEffect(() => {
    const id = setTimeout(() => {
      const q = query.trim().toLowerCase()
      if (!q) { setValue(all); return }
      setValue(all.filter(t => t.label.toLowerCase().includes(q)))
    }, delay)
    return () => clearTimeout(id)
  }, [all, query, delay])
  return value
}

