export type ID = string

export interface WorkspaceOption {
  id: ID
  name: string
  slug?: string
  description?: string
  avatarUrl?: string
}

export interface TreeNode {
  id: ID
  name: string
  icon?: string
  isExpanded?: boolean
  isSelected?: boolean
  isDisabled?: boolean
  children: TreeNode[]
}

export type MovePosition = 'before' | 'after' | 'inside'

export interface TreeMoveEvent {
  sourceId: ID
  targetId: ID
  position: MovePosition
}

export interface TagOption {
  id: ID
  label: string
  color?: string
}

export type MetadataFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'url'

export interface MetadataFieldDefinition {
  name: string
  label: string
  type: MetadataFieldType
  required?: boolean
  placeholder?: string
  description?: string
  options?: { label: string; value: string }[] // for select/multiselect
  min?: number
  max?: number
}

export type MetadataValues = Record<string, unknown>
