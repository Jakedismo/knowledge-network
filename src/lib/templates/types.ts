export type TemplateVisibility = 'private' | 'workspace' | 'public'

export type TemplateVariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'user'
  | 'workspace'
  | 'collection'
  | 'tags'

export interface TemplateVariableSpec {
  key: string
  label: string
  type: TemplateVariableType
  required?: boolean
  description?: string
  defaultValue?: string | number | boolean | null
}

export interface TemplateMetadata {
  id: string
  name: string
  description?: string
  category?: string
  keywords?: string[]
  version: string
  visibility: TemplateVisibility
  authorId?: string
  workspaceId?: string
  createdAt: string
  updatedAt: string
  changelog?: string[]
}

export interface TemplateDefinition extends TemplateMetadata {
  variables: TemplateVariableSpec[]
  // Content is Markdown with handlebars-like expressions: {{ variable | helper(arg) }}
  content: string
}

export type TemplateInput = Omit<TemplateDefinition,
  'id' | 'createdAt' | 'updatedAt' | 'version'
> & { version?: string }

export type TemplateRenderContext = Record<string, unknown>

export interface TemplateRenderResult {
  content: string
  appliedVariables: Record<string, unknown>
  metadataUpdates?: {
    title?: string
    tags?: string[]
    collectionId?: string
  }
}

export interface TemplateSearchParams {
  q?: string
  category?: string
  workspaceId?: string
  visibility?: TemplateVisibility
  limit?: number
  offset?: number
}

