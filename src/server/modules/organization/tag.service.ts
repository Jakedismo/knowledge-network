import { prisma } from '@/lib/db/prisma'
import type { TagSuggestParams } from './models'
import { emitReindexForTag } from '@/server/modules/search/emitter'

export class TagService {
  async create(workspaceId: string, name: string, color?: string) {
    const tag = await prisma.tag.create({ data: { workspaceId, name, color: color ?? null } })
    await emitReindexForTag(workspaceId, tag.id)
    return tag
  }

  async update(id: string, name?: string, color?: string | null) {
    const updated = await prisma.tag.update({ where: { id }, data: { name, color: color ?? undefined } })
    const ws = await prisma.tag.findUnique({ where: { id }, select: { workspaceId: true } })
    if (ws) await emitReindexForTag(ws.workspaceId, id)
    return updated
  }

  async remove(id: string) {
    const ws = await prisma.tag.findUnique({ where: { id }, select: { workspaceId: true } })
    await prisma.tag.delete({ where: { id } })
    if (ws) await emitReindexForTag(ws.workspaceId, id)
  }

  async list(workspaceId: string) {
    return prisma.tag.findMany({ where: { workspaceId }, orderBy: { usageCount: 'desc' } })
  }

  // Lightweight auto-suggestion: combines prefix match, usage popularity, and simple content hinting
  async suggest(params: TagSuggestParams) {
    const { workspaceId, query, contentText, limit = 8 } = params
    const q = (query ?? '').trim().toLowerCase()
    const tags = await prisma.tag.findMany({ where: { workspaceId }, orderBy: { usageCount: 'desc' }, take: 50 })
    const scored: Array<{ tag: (typeof tags)[number]; score: number }> = tags.map((t: (typeof tags)[number]) => ({ tag: t, score: this.scoreTag(t.name, q, contentText ?? '', t.usageCount) }))
    return scored
      .filter((s: { score: number }) => s.score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(50, limit)))
      .map((s: { tag: (typeof tags)[number] }) => s.tag)
  }

  private scoreTag(name: string, query: string, content: string, usage: number): number {
    let score = 0
    const n = name.toLowerCase()
    if (!query && !content) return usage // popularity only as fallback
    if (query) {
      if (n === query) score += 100
      else if (n.startsWith(query)) score += 40
      else if (n.includes(query)) score += 10
    }
    if (content) {
      // naive token presence scoring
      const occurrences = (content.toLowerCase().match(new RegExp(`\\b${this.escapeRegex(n)}\\b`, 'g')) || []).length
      score += Math.min(50, occurrences * 15)
    }
    // mild popularity boost
    score += Math.log10(1 + Math.max(0, usage)) * 5
    return score
  }

  private escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

export const tagService = new TagService()
