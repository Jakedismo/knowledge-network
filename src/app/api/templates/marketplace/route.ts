import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import '@/server/startup'

export async function GET() {
  const listings = await prisma.templateListing.findMany({
    where: { visibility: { in: ['PUBLIC', 'UNLISTED'] as any }, status: 'PUBLISHED' as any },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, description: true, categories: true, tags: true, templateId: true, visibility: true },
  })
  return NextResponse.json({ listings })
}

