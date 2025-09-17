import { prisma } from '@/lib/db/prisma'

type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue }

export class MetadataService {
  // Flatten JSON into index entries for targeted filtering/sorting
  async reindexKnowledge(knowledgeId: string, metadata: Record<string, JSONValue>) {
    // Replace all existing entries for this knowledge
    await prisma.metadataIndexEntry.deleteMany({ where: { knowledgeId } })
    const rows = this.flatten(metadata)
    if (rows.length === 0) return
    await prisma.metadataIndexEntry.createMany({ data: rows.map((r) => ({ knowledgeId, ...r })) })
  }

  private flatten(obj: Record<string, JSONValue>, base: string = ''): Array<{
    keyPath: string
    valueType: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN'
    stringVal?: string | null
    numberVal?: number | null
    dateVal?: Date | null
    boolVal?: boolean | null
  }> {
    const rows: Array<any> = []
    for (const [k, v] of Object.entries(obj)) {
      const key = base ? `${base}.${k}` : k
      if (v === null) continue
      if (Array.isArray(v)) {
        // index primitive array items individually
        for (const item of v) {
          if (typeof item === 'string') rows.push({ keyPath: key, valueType: 'STRING', stringVal: item })
          else if (typeof item === 'number') rows.push({ keyPath: key, valueType: 'NUMBER', numberVal: item })
          else if (typeof item === 'boolean') rows.push({ keyPath: key, valueType: 'BOOLEAN', boolVal: item })
        }
      } else if (typeof v === 'object') {
        rows.push(...this.flatten(v as any, key))
      } else if (typeof v === 'string') {
        // ISO date heuristic
        const maybeDate = this.tryParseDate(v)
        if (maybeDate) rows.push({ keyPath: key, valueType: 'DATE', dateVal: maybeDate })
        else rows.push({ keyPath: key, valueType: 'STRING', stringVal: v })
      } else if (typeof v === 'number') {
        rows.push({ keyPath: key, valueType: 'NUMBER', numberVal: v })
      } else if (typeof v === 'boolean') {
        rows.push({ keyPath: key, valueType: 'BOOLEAN', boolVal: v })
      }
    }
    return rows
  }

  private tryParseDate(s: string): Date | null {
    // Strict basic ISO parsing
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }
}

export const metadataService = new MetadataService()

