import { prisma } from '@/lib/db/prisma'
import { CreateWorkspaceInput, UpdateWorkspaceInput } from './models'

export class WorkspaceService {
  async create(input: CreateWorkspaceInput) {
    const ws = await prisma.workspace.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        ...(input.settings !== undefined ? { settings: (input.settings as any) } : {}),
        ownerId: input.ownerId,
      },
    })
    return ws
  }

  async update(input: UpdateWorkspaceInput) {
    const ws = await prisma.workspace.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        settings: (input.settings ?? undefined) as any,
        isActive: input.isActive,
      },
    })
    return ws
  }

  async remove(id: string) {
    await prisma.workspace.delete({ where: { id } })
  }

  async get(id: string) {
    return prisma.workspace.findUnique({ where: { id } })
  }

  async list(userId?: string) {
    // For now list all when no user filter; later filter by membership
    if (!userId) return prisma.workspace.findMany({ orderBy: { createdAt: 'desc' } })
    // Placeholder: if membership table exists, filter by it. Using userWorkspaceRoles in schema.
    return prisma.workspace.findMany({
      where: { userRoles: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    })
  }
}

export const workspaceService = new WorkspaceService()
