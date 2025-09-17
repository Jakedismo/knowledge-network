"use client"
import * as React from 'react'
import { Avatar, Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Input } from '@/components/ui'
import { type WorkspaceOption } from './types'
import { cn } from '@/lib/utils'

export interface WorkspaceSwitcherProps {
  workspaces: WorkspaceOption[]
  currentId?: string
  onSwitch: (id: string) => void
  className?: string
  searchable?: boolean
}

export function WorkspaceSwitcher({ workspaces, currentId, onSwitch, className, searchable = true }: WorkspaceSwitcherProps) {
  const current = workspaces.find(w => w.id === currentId) ?? workspaces[0]
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return workspaces
    return workspaces.filter(w => w.name.toLowerCase().includes(q) || w.slug?.toLowerCase().includes(q))
  }, [query, workspaces])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('w-full justify-between', className)} aria-label="Switch workspace">
          <span className="flex items-center gap-2 truncate">
            {current?.avatarUrl ? (
              <Avatar src={current.avatarUrl} alt={current.name} size="sm" />
            ) : (
              <Badge variant="secondary" className="rounded-full w-6 h-6 flex items-center justify-center text-xs">
                {current?.name?.slice(0, 2)?.toUpperCase()}
              </Badge>
            )}
            <span className="truncate">{current?.name ?? 'Select workspace'}</span>
          </span>
          <span aria-hidden>▾</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="start">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {searchable && (
          <div className="p-2 pt-0">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter workspaces"
              aria-label="Filter workspaces"
            />
          </div>
        )}
        <DropdownMenuSeparator />
        <div role="listbox" aria-label="Workspace list" className="max-h-80 overflow-auto">
          {filtered.map(w => (
            <DropdownMenuItem key={w.id} onSelect={() => onSwitch(w.id)} aria-selected={w.id === current?.id}>
              <div className="flex items-center gap-2 min-w-0">
                {w.avatarUrl ? (
                  <Avatar src={w.avatarUrl} alt="" size="xs" />
                ) : (
                  <Badge variant="outline" className="rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                    {w.name.slice(0, 2).toUpperCase()}
                  </Badge>
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">{w.name}</div>
                  {w.slug && <div className="text-xs text-muted-foreground truncate">{w.slug}</div>}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          {filtered.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">No workspaces match &quot;{query}&quot;</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
