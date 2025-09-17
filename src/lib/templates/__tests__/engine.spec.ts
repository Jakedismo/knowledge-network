import { describe, it, expect } from 'vitest'
import { renderTemplate } from '../engine'
import type { TemplateDefinition } from '../types'

describe('template engine', () => {
  const def: TemplateDefinition = {
    id: 't1',
    name: 'Demo',
    description: '',
    category: 'demo',
    keywords: [],
    version: '1.0.0',
    visibility: 'private',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variables: [
      { key: 'title', label: 'Title', type: 'string', required: true },
      { key: 'owner', label: 'Owner', type: 'user' },
    ],
    content: '# {{ title | upper }} — {{ owner | lower }}',
  }

  it('applies helpers and variables', () => {
    const out = renderTemplate(def, { title: 'Hello', owner: 'Alice' })
    expect(out.content).toContain('# HELLO — alice')
  })
})

