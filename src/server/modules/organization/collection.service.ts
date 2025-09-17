import { prisma } from '@/lib/db/prisma'
import { CreateCollectionInput, MoveCollectionInput, UpdateCollectionInput } from './models'
import { emitReindexForCollection } from '@/server/modules/search/emitter'

export class CollectionService {
  async create(input: CreateCollectionInput) {
    await this.assertParentInWorkspace(input.workspaceId, input.parentId ?? null)
    const created = await prisma.collection.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? null,
        icon: input.icon ?? null,
        workspaceId: input.workspaceId,
        parentId: input.parentId ?? null,
        type: input.type === 'SMART' ? 'SMART' : 'FOLDER',
      },
    })
    await emitReindexForCollection(input.workspaceId, created.id)
    return created
  }

  async update(input: UpdateCollectionInput) {
    const updated = await prisma.collection.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        color: input.color,
        icon: input.icon,
      },
    })
    const ws = await prisma.collection.findUnique({ where: { id: input.id }, select: { workspaceId: true } })
    if (ws) await emitReindexForCollection(ws.workspaceId, input.id)
    return updated
  }

  async move(input: MoveCollectionInput) {
    // Prevent cycles
    if (input.parentId && input.parentId === input.id) throw new Error('Cannot set a collection as its own parent')
    await this.assertParentInWorkspace(input.workspaceId, input.parentId)
    // Optional: ensure no cyclic ancestry
    if (input.parentId) {
      const ancestors = await this.getAncestorIds(input.parentId)
      if (ancestors.has(input.id)) throw new Error('Cannot move collection under its descendant')
    }
    const updated = await prisma.collection.update({ where: { id: input.id }, data: { parentId: input.parentId } })
    const ws = await prisma.collection.findUnique({ where: { id: input.id }, select: { workspaceId: true } })
    if (ws) await emitReindexForCollection(ws.workspaceId, input.id)
    return updated
  }

  async remove(id: string) {
    // Soft validation: ensure no children before delete
    const childCount = await prisma.collection.count({ where: { parentId: id } })
    if (childCount > 0) throw new Error('Cannot delete a collection with children')
    const ws = await prisma.collection.findUnique({ where: { id }, select: { workspaceId: true } })
    await prisma.collection.delete({ where: { id } })
    if (ws) await emitReindexForCollection(ws.workspaceId, id)
  }

  private async assertParentInWorkspace(workspaceId: string, parentId: string | null) {
    if (!parentId) return
    const parent = await prisma.collection.findUnique({ where: { id: parentId }, select: { workspaceId: true } })
    if (!parent || parent.workspaceId !== workspaceId) throw new Error('Parent collection not found in workspace')
  }

  private async getAncestorIds(id: string): Promise<Set<string>> {
    const result = new Set<string>()
    let current: string | null = id
    // Walk up at most 128 steps to avoid infinite loops
    for (let i = 0; i < 128 && current; i++) {
      const node: { parentId: string | null } | null = await prisma.collection.findUnique({ where: { id: current }, select: { parentId: true } })
      if (!node?.parentId) break
      if (result.has(node.parentId)) break
      result.add(node.parentId)
      current = node.parentId
    }
    return result
  }
}

export const collectionService = new CollectionService()
