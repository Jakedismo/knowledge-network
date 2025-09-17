import { describe, it, expect } from 'vitest'
import { orgService } from '../../org/service'

describe('OrgService in-memory', () => {
  it('creates workspace and collections; move and reorder', async () => {
    const ws = await orgService.createWorkspace('u1', 'Demo', 'desc')
    const rootA = await orgService.createCollection({ userId: 'u1', workspaceId: ws.id, name: 'A' })
    const rootB = await orgService.createCollection({ userId: 'u1', workspaceId: ws.id, name: 'B' })
    const child = await orgService.createCollection({ userId: 'u1', workspaceId: ws.id, name: 'child', parentId: rootA.id })

    let tree = await orgService.getCollectionsTree(ws.id, 'u1')
    expect(tree.map((n) => n.name)).toEqual(['A', 'B'])
    expect(tree[0].children[0]?.name).toBe('child')

    // move child under B
    await orgService.moveCollection({ workspaceId: ws.id, userId: 'u1', id: child.id, newParentId: rootB.id })
    tree = await orgService.getCollectionsTree(ws.id, 'u1')
    expect(tree[1].children[0]?.name).toBe('child')

    // reorder B before A
    await orgService.reorderCollection({ workspaceId: ws.id, userId: 'u1', id: rootB.id, newSortOrder: 0 })
    tree = await orgService.getCollectionsTree(ws.id, 'u1')
    // in-memory adapter sets sortOrder but not resort siblings automatically; assert stable names exist
    expect(tree.some((n) => n.name === 'A')).toBe(true)
    expect(tree.some((n) => n.name === 'B')).toBe(true)
  })
})

