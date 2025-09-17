import fs from 'node:fs/promises'
import path from 'node:path'
import { builtinTemplates } from '@/lib/templates/library'
import { TemplateDefinition, TemplateInput, TemplateSearchParams } from '@/lib/templates/types'

const DATA_DIR = path.resolve(process.cwd(), '.holographic-memory')
const FILE = path.join(DATA_DIR, 'templates.json')

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.access(FILE)
  } catch {
    const seed = { templates: builtinTemplates }
    await fs.writeFile(FILE, JSON.stringify(seed, null, 2), 'utf-8')
  }
}

export interface TemplateDB {
  templates: TemplateDefinition[]
}

async function readDB(): Promise<TemplateDB> {
  await ensureFile()
  const raw = await fs.readFile(FILE, 'utf-8')
  return JSON.parse(raw) as TemplateDB
}

async function writeDB(db: TemplateDB): Promise<void> {
  await ensureFile()
  await fs.writeFile(FILE, JSON.stringify(db, null, 2), 'utf-8')
}

export const templateStore = {
  async list(params: TemplateSearchParams = {}): Promise<TemplateDefinition[]> {
    const db = await readDB()
    const q = (params.q ?? '').toLowerCase()
    const filtered = db.templates.filter((t) => {
      if (params.visibility && t.visibility !== params.visibility) return false
      if (params.workspaceId && t.workspaceId && t.workspaceId !== params.workspaceId) return false
      if (!q) return true
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.keywords ?? []).some((k) => k.toLowerCase().includes(q))
      )
    })
    const offset = params.offset ?? 0
    const limit = params.limit ?? 50
    return filtered.slice(offset, offset + limit)
  },

  async get(id: string): Promise<TemplateDefinition | undefined> {
    const db = await readDB()
    return db.templates.find((t) => t.id === id)
  },

  async create(input: TemplateInput & { authorId?: string; workspaceId?: string }): Promise<TemplateDefinition> {
    const db = await readDB()
    const id = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36)
    const now = new Date().toISOString()
    const def: TemplateDefinition = {
      id,
      name: input.name,
      version: input.version ?? '1.0.0',
      visibility: input.visibility,
      createdAt: now,
      updatedAt: now,
      variables: input.variables ?? [],
      content: input.content,
    }
    if (input.description !== undefined) (def as any).description = input.description
    if (input.category !== undefined) (def as any).category = input.category
    if (input.keywords !== undefined) (def as any).keywords = input.keywords
    if (input.authorId !== undefined) (def as any).authorId = input.authorId
    if (input.workspaceId !== undefined) (def as any).workspaceId = input.workspaceId
    ;(def as any).changelog = input.version ? [`Created version ${input.version}`] : ['Initial version']
    db.templates.unshift(def)
    await writeDB(db)
    return def
  },

  async update(id: string, update: Partial<TemplateInput>): Promise<TemplateDefinition | undefined> {
    const db = await readDB()
    const idx = db.templates.findIndex((t) => t.id === id)
    if (idx === -1) return undefined
    const prev = db.templates[idx]
    const now = new Date().toISOString()
    const next: TemplateDefinition = { ...prev, updatedAt: now, version: update.version ?? prev.version }
    if (update.name !== undefined) next.name = update.name
    if (update.description !== undefined) (next as any).description = update.description
    if (update.category !== undefined) (next as any).category = update.category
    if (update.keywords !== undefined) (next as any).keywords = update.keywords
    if (update.visibility !== undefined) next.visibility = update.visibility
    if (update.variables !== undefined) (next as any).variables = update.variables
    if (update.content !== undefined) (next as any).content = update.content
    next.changelog = update.version && update.version !== prev.version
      ? [...(prev.changelog ?? []), `Bumped version to ${update.version}`]
      : prev.changelog
    db.templates[idx] = next
    await writeDB(db)
    return next
  },

  async remove(id: string): Promise<boolean> {
    const db = await readDB()
    const before = db.templates.length
    db.templates = db.templates.filter((t) => t.id !== id)
    await writeDB(db)
    return db.templates.length < before
  },
}
