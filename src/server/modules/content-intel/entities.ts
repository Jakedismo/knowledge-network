import { Entity } from './types'

export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = []

  // URLs
  const urlRe = /https?:\/\/[^\s)]+/g
  for (const m of text.matchAll(urlRe)) {
    entities.push({ type: 'URL', text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length })
  }

  // Emails
  const emailRe = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
  for (const m of text.matchAll(emailRe)) {
    entities.push({ type: 'EMAIL', text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length })
  }

  // Naive capitalized multi-word proper nouns (English-like heuristic)
  const capSeqRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g
  for (const m of text.matchAll(capSeqRe)) {
    const t = m[1]
    // Filter out sentence-start common words by heuristic
    if (/^(The|This|That|An|A|In|On|At|By|From|With|For|And|But)\b/.test(t)) continue
    entities.push({ type: 'OTHER', text: t, start: m.index ?? 0, end: (m.index ?? 0) + t.length })
  }

  // Dates (very simple)
  const dateRe = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/(\d{1,2})\/(\d{2,4})|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*\d{4})\b/gi
  for (const m of text.matchAll(dateRe)) {
    entities.push({ type: 'DATE', text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length })
  }

  return dedupeBySpan(entities)
}

function dedupeBySpan(items: Entity[]): Entity[] {
  const key = (e: Entity) => `${e.start}-${e.end}-${e.type}`
  const seen = new Set<string>()
  const out: Entity[] = []
  for (const e of items.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))) {
    const k = key(e)
    if (!seen.has(k)) {
      out.push(e)
      seen.add(k)
    }
  }
  return out
}

