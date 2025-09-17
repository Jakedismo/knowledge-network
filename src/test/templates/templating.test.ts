import { describe, it, expect } from 'vitest'
import { extractPlaceholders, renderTemplate } from '@/server/modules/templates/templating'

describe('templating', () => {
  it('extracts placeholders', () => {
    const keys = extractPlaceholders('Hello {{name}}, today is {{ day }}.')
    expect(keys.sort()).toEqual(['day', 'name'])
  })

  it('renders with values', () => {
    const out = renderTemplate('Hello {{name}}!', { name: 'Ada' })
    expect(out).toBe('Hello Ada!')
  })

  it('sanitizes string values', () => {
    const out = renderTemplate('X {{val}}', { val: '<script>alert(1)</script>' })
    expect(out.includes('<')).toBe(false)
  })
})

