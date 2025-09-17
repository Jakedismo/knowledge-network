export interface CreateTemplateInput {
  workspaceId: string
  authorId: string
  title: string
  content: string
  metadata?: Record<string, unknown>
  collectionId?: string | null
}

export interface UpdateTemplateInput {
  id: string
  title?: string
  content?: string
  metadata?: Record<string, unknown>
  collectionId?: string | null
  changeSummary?: string
  branchName?: string
}

export interface ApplyTemplateInput {
  templateId: string
  target: {
    workspaceId: string
    authorId: string
    collectionId?: string | null
    title?: string
  }
  values?: Record<string, string | number | boolean | null>
}

export interface ShareTemplateInput {
  templateId: string
  workspaceId: string
  grants: Array<
    | { kind: 'USER'; subjectId: string; permissions: string[] }
    | { kind: 'ROLE'; subjectId: string; permissions: string[] }
  >
}

export interface PublishTemplateInput {
  templateId: string
  workspaceId: string
  creatorId: string
  visibility: 'PUBLIC' | 'UNLISTED' | 'WORKSPACE'
  title: string
  description?: string
  categories?: string[]
  tags?: string[]
}

export interface CommitVersionInput {
  templateId: string
  authorId: string
  content: string
  changeSummary?: string
  branchName?: string
}

