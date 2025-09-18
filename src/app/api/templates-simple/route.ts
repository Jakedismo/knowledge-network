import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''
    const publicOnly = searchParams.get('public') === 'true'

    // Build where clause
    const where: any = {}

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } }
      ]
    }

    if (category) {
      where.category = category
    }

    if (publicOnly) {
      where.isPublic = true
    }

    // Fetch templates from database
    const templates = await prisma.template.findMany({
      where,
      orderBy: {
        usageCount: 'desc'
      },
      take: 20
    })

    // Parse tags from JSON string
    const templatesWithParsedTags = templates.map(template => ({
      ...template,
      tags: JSON.parse(template.tags || '[]')
    }))

    return NextResponse.json({
      templates: templatesWithParsedTags,
      total: templatesWithParsedTags.length
    })
  } catch (error) {
    console.error('Templates API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      content,
      category = 'general',
      tags = [],
      isPublic = false
    } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const template = await prisma.template.create({
      data: {
        title,
        description,
        content,
        category,
        tags: JSON.stringify(tags),
        isPublic
      }
    })

    return NextResponse.json({
      ...template,
      tags: JSON.parse(template.tags || '[]')
    }, { status: 201 })
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}