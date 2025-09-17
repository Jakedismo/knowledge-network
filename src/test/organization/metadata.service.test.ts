import { describe, it, expect } from 'vitest'
import { metadataService } from '@/server/modules/organization/metadata.service'

// Access private flatten via casting for testing
const svc = metadataService as unknown as { flatten: (obj: any, base?: string) => any[] }

describe('MetadataService.flatten', () => {
  it('indexes nested keys and typed values', () => {
    const rows = svc.flatten({ a: 'x', n: 3, b: { c: true, d: '2024-01-02' }, arr: ['x', 1, false] })
    const keyPaths = new Set(rows.map((r) => r.keyPath))
    expect(keyPaths.has('a')).toBe(true)
    expect(keyPaths.has('n')).toBe(true)
    expect(keyPaths.has('b.c')).toBe(true)
    expect(keyPaths.has('b.d')).toBe(true)
    expect(keyPaths.has('arr')).toBe(true)
    // Ensure date typed
    const dateRow = rows.find((r) => r.keyPath === 'b.d')
    expect(dateRow?.valueType).toBe('DATE')
  })
})

