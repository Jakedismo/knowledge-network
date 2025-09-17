const TOKEN = /\{\{\s*([a-zA-Z0-9_.\-]{1,64})\s*\}\}/g

export function extractPlaceholders(text: string): string[] {
  const keys = new Set<string>()
  for (const m of text.matchAll(TOKEN)) keys.add(m[1])
  return [...keys]
}

export function renderTemplate(
  text: string,
  values: Record<string, string | number | boolean | null | undefined>
): string {
  return text.replace(TOKEN, (_, key: string) => {
    const v = values[key]
    if (v === undefined || v === null) return ''
    // Ensure primitive output only; prevent object injection
    if (typeof v === 'string') return sanitize(v)
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return ''
  })
}

function sanitize(s: string): string {
  // Strip dangerous sequences (basic XSS hardening for text)
  return s
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
}

