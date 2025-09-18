export type PromptVarValue = string | number | boolean

export interface PromptTemplate<Vars extends Record<string, PromptVarValue> = Record<string, PromptVarValue>> {
  id: string
  system?: string
  template: string
  required?: (keyof Vars)[]
  defaults?: Partial<Vars>
}

const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g

export function renderPrompt<V extends Record<string, PromptVarValue>>(
  tpl: PromptTemplate<V>,
  vars: Partial<V> = {}
): { system?: string; content: string } {
  const required = tpl.required ?? []
  const merged: Record<string, PromptVarValue> = { ...(tpl.defaults ?? {}), ...(vars as Record<string, PromptVarValue>) }
  for (const k of required) {
    if (!(k as string in merged)) throw new Error(`Missing prompt var: ${String(k)}`)
  }
  const content = tpl.template.replace(VAR_PATTERN, (_, key: string) => {
    const v = lookup(merged, key)
    if (v === undefined || v === null) return ''
    return String(v)
  })
  return { system: tpl.system, content }
}

function lookup(obj: Record<string, PromptVarValue>, path: string): PromptVarValue | undefined {
  if (!path.includes('.')) return obj[path]
  return path.split('.').reduce<PromptVarValue | undefined>((acc, p) => {
    if (acc == null) return undefined
    if (typeof acc !== 'object') return undefined
    return (acc as any)[p]
  }, obj as any)
}

export const BASE_SYSTEM_PROMPT = `
You are an AI framework component for a Knowledge Network platform.
Follow security, privacy, and RBAC constraints strictly. Avoid generating PII.
Respond with concise, structured outputs that the calling service can parse.
` as const

