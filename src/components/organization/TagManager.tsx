"use client"
import * as React from 'react'
import { Badge, Button, Input, List, ListItem, ListItemText } from '@/components/ui'
import type { TagOption } from './types'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TagManagerProps {
  value: TagOption[]
  onChange: (next: TagOption[]) => void
  suggestions?: TagOption[]
  placeholder?: string
  className?: string
}

export function TagManager({ value, onChange, suggestions = [], placeholder = 'Add tag…', className }: TagManagerProps) {
  const [query, setQuery] = React.useState('')
  const [color, setColor] = React.useState<string | undefined>(undefined)
  const [debounced, setDebounced] = React.useState('')
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(id)
  }, [query])
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)

  const filtered = React.useMemo(() => {
    const q = debounced.trim().toLowerCase()
    const selectedIds = new Set(value.map(v => v.id))
    return suggestions
      .filter(s => !selectedIds.has(s.id))
      .filter(s => (q ? s.label.toLowerCase().includes(q) : true))
      .slice(0, 8)
  }, [debounced, suggestions, value])

  function addTag(tag: TagOption) {
    if (value.some(v => v.id === tag.id)) return
    onChange([...value, tag])
    setQuery('')
    setColor(undefined)
    setActiveIndex(-1)
  }

  function removeTag(id: string) {
    onChange(value.filter(v => v.id !== id))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && filtered[activeIndex]) {
        addTag(filtered[activeIndex])
        return
      }
      const trimmed = query.trim()
      if (trimmed) {
        addTag({ id: trimmed.toLowerCase(), label: trimmed, color })
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    }
    if (e.key === 'Backspace' && query === '' && value.length) {
      removeTag(value[value.length - 1]!.id)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2" aria-live="polite">
        {value.map(tag => (
          <Badge key={tag.id} variant="secondary" className="gap-1">
            {tag.color && <span aria-hidden className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />}
            <span>{tag.label}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="p-0 h-4 w-4 text-[10px]"
              onClick={() => removeTag(tag.id)}
              aria-label={`Remove tag ${tag.label}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
      <div className="relative flex items-center gap-2">
        <label className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-label="Choose tag color">
          <span className="sr-only">Choose tag color</span>
          <input
            type="color"
            value={color ?? '#888888'}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Tag color"
            className="h-8 w-8 p-0 border rounded cursor-pointer"
          />
        </label>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={filtered.length > 0}
          role="combobox"
        />
        {filtered.length > 0 && (
          <div className="absolute left-10 right-0 z-10 mt-1 rounded-md border bg-popover shadow">
            <List role="listbox" aria-label="Tag suggestions">
              {filtered.map((opt, i) => (
                <ListItem
                  key={opt.id}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(opt)}
                  className={cn('cursor-pointer', i === activeIndex && 'bg-accent')}
                >
                  <ListItemText>{opt.label}</ListItemText>
                </ListItem>
              ))}
            </List>
          </div>
        )}
      </div>
    </div>
  )
}
