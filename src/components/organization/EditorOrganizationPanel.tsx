"use client"
import * as React from 'react'
import { Separator } from '@/components/ui/separator'
import { Breadcrumbs } from './Breadcrumbs'
import { MetadataForm } from './MetadataForm'
import { TagManager } from './TagManager'
import { TreeView } from './TreeView'
import type { MetadataFieldDefinition, TagOption, TreeMoveEvent, TreeNode, WorkspaceOption } from './types'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { cn } from '@/lib/utils'

export interface EditorOrganizationPanelProps {
  className?: string
  // Workspaces
  workspaces: WorkspaceOption[]
  currentWorkspaceId?: string
  onSwitchWorkspace?: (id: string) => void
  // Folder tree
  tree: TreeNode[]
  onTreeToggle?: (id: string, expanded: boolean) => void
  onTreeSelect?: (id: string) => void
  onTreeMove?: (e: TreeMoveEvent) => void
  // Breadcrumbs
  breadcrumbs: { label: string; href?: string }[]
  // Tags
  tags: TagOption[]
  onTagsChange?: (next: TagOption[]) => void
  tagSuggestions?: TagOption[]
  // Metadata
  metadataFields: MetadataFieldDefinition[]
  metadataValues?: Record<string, unknown>
  onMetadataChange?: (values: Record<string, unknown>) => void
}

export function EditorOrganizationPanel(props: EditorOrganizationPanelProps) {
  const {
    className,
    workspaces,
    currentWorkspaceId,
    onSwitchWorkspace,
    tree,
    onTreeToggle,
    onTreeSelect,
    onTreeMove,
    breadcrumbs,
    tags,
    onTagsChange,
    tagSuggestions,
    metadataFields,
    metadataValues,
    onMetadataChange,
  } = props

  return (
    <aside className={cn('w-full sm:w-80 md:w-96 p-3 space-y-3 bg-muted/30 border-l', className)} aria-label="Organization panel">
      <div>
        <WorkspaceSwitcher
          workspaces={workspaces}
          {...(currentWorkspaceId ? { currentId: currentWorkspaceId } : {})}
          onSwitch={(id) => onSwitchWorkspace?.(id)}
        />
      </div>
      <div>
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <Separator />
      <section aria-labelledby="folders-heading">
        <h3 id="folders-heading" className="text-sm font-medium mb-2">Folders</h3>
        <TreeView
          nodes={tree}
          {...(onTreeToggle ? { onToggle: onTreeToggle } : {})}
          {...(onTreeSelect ? { onSelect: onTreeSelect } : {})}
          {...(onTreeMove ? { onMove: onTreeMove } : {})}
        />
      </section>
      <Separator />
      <section aria-labelledby="tags-heading">
        <h3 id="tags-heading" className="text-sm font-medium mb-2">Tags</h3>
        <TagManager value={tags} onChange={(next) => onTagsChange?.(next)} suggestions={tagSuggestions ?? []} />
      </section>
      <Separator />
      <section aria-labelledby="metadata-heading">
        <h3 id="metadata-heading" className="text-sm font-medium mb-2">Metadata</h3>
        <MetadataForm
          fields={metadataFields}
          {...(metadataValues ? { values: metadataValues } : {})}
          {...(onMetadataChange ? { onChange: onMetadataChange } : {})}
        />
      </section>
    </aside>
  )
}
