import { describe, it, expect } from 'vitest'
import { PluginRegistry } from '@/lib/editor/registry'

describe('PluginRegistry', () => {
  it('registers and toggles plugins', () => {
    const reg = new PluginRegistry()
    reg.register('eq', { name: 'eq', version: '1.0.0', title: 'Eq' })
    const list = reg.list()
    expect(list).toHaveLength(1)
    expect(list[0].enabled).toBe(true)
    reg.setEnabled('eq', false)
    expect(reg.get('eq')?.enabled).toBe(false)
  })
})

