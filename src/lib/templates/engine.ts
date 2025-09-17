import { TemplateDefinition, TemplateRenderContext, TemplateRenderResult } from './types'

type HelperFn = (value: any, ...args: any[]) => string

const helpers: Record<string, HelperFn> = {
  // case helpers
  upper: (v: any) => String(v ?? '').toUpperCase(),
  lower: (v: any) => String(v ?? '').toLowerCase(),
  slug: (v: any) => String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-'),
  // date helpers
  date: (v: any, fmt: string = 'YYYY-MM-DD') => formatDate(v ?? new Date(), fmt),
  now: (_: any, fmt: string = 'YYYY-MM-DD') => formatDate(new Date(), fmt),
  // string helpers
  trim: (v: any) => String(v ?? '').trim(),
  quotes: (v: any) => `"${String(v ?? '')}"`,
}

function pad(n: number) { return n < 10 ? `0${n}` : String(n) }

function formatDate(input: string | number | Date, fmt: string): string {
  const d = input instanceof Date ? input : new Date(input)
  const YYYY = String(d.getFullYear())
  const MM = pad(d.getMonth() + 1)
  const DD = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  return fmt
    .replace(/YYYY/g, YYYY)
    .replace(/MM/g, MM)
    .replace(/DD/g, DD)
    .replace(/hh/g, hh)
    .replace(/mm/g, mm)
    .replace(/ss/g, ss)
}

// Very small and safe handlebars-like renderer.
// Supports: {{ key }}, {{ key | helper }}, {{ key | helper('arg') }} and chained helpers.
// Does not execute arbitrary code. Escapes HTML by default.
export function renderTemplate(def: TemplateDefinition, ctx: TemplateRenderContext): TemplateRenderResult {
  const applied: Record<string, unknown> = {}

  // Pre-collect variables
  for (const v of def.variables) {
    const provided = ctx[v.key]
    if (provided == null) {
      if (v.required && v.defaultValue == null) {
        // leave placeholder so caller can prompt; do not fail render
        continue
      }
      applied[v.key] = v.defaultValue ?? null
    } else {
      applied[v.key] = provided
    }
  }

  const re = /\{\{\s*([^}|]+?)\s*(\|[^}]+)?\s*\}\}/g
  const output = def.content.replace(re, (_match, key: string, helperChain?: string) => {
    const rawValue = (ctx as any)[key] ?? (applied as any)[key] ?? ''
    const chain = (helperChain || '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)

    let val: any = rawValue
    for (const h of chain) {
      const m = /([a-zA-Z0-9_]+)\s*(?:\((.*)\))?/.exec(h)
      if (!m) continue
      const [, name, argStr] = m
      const keyName = String(name) as keyof typeof helpers
      const fn = helpers[keyName]
      if (!fn) continue
      const args = parseArgs(argStr)
      val = fn(val, ...args)
    }
    return escapeMarkdown(String(val ?? ''))
  })

  return { content: output, appliedVariables: applied }
}

function parseArgs(argStr?: string): any[] {
  if (!argStr) return []
  // extremely small arg parser for strings/numbers
  const parts: string[] = []
  let buf = ''
  let inStr = false
  for (let i = 0; i < argStr.length; i++) {
    const ch = argStr[i]
    if (ch === "'" || ch === '"') {
      inStr = !inStr
      continue
    }
    if (ch === ',' && !inStr) {
      parts.push(buf.trim())
      buf = ''
      continue
    }
    buf += ch
  }
  if (buf) parts.push(buf.trim())
  return parts.map((p) => (Number.isFinite(Number(p)) ? Number(p) : p))
}

function escapeMarkdown(s: string): string {
  // Keep minimal escaping suitable for Markdown content injection
  return s.replace(/[<>]/g, (m) => (m === '<' ? '&lt;' : '&gt;'))
}

export const TemplateHelpers = helpers
