import { prisma } from '@/lib/prisma';
import { IndexDocument, KnowledgeStatus } from './types';
import { marked } from 'marked';
import { JSDOM } from 'jsdom';

export class ProjectionService {
  /**
   * Project a knowledge entity to an index document
   */
  async projectToIndex(knowledgeId: string): Promise<IndexDocument | null> {
    try {
      const knowledge = await prisma.knowledge.findUnique({
        where: { id: knowledgeId },
        include: {
          author: true,
          collection: true,
          tags: {
            include: {
              tag: true
            }
          },
          metadata: true
        }
      });

      if (!knowledge) {
        return null;
      }

      // Extract plain text from markdown content
      const plainContent = await this.extractPlainText(knowledge.content);

      // Build collection path
      const collectionPath = knowledge.collection ?
        await this.buildCollectionPath(knowledge.collection.id) : '';

      // Transform metadata entries to facets
      const facets = knowledge.metadata.map(m => ({
        keyPath: m.keyPath,
        type: m.valueType as 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN',
        stringVal: m.stringVal || undefined,
        numberVal: m.numberVal || undefined,
        dateVal: m.dateVal?.toISOString() || undefined,
        boolVal: m.boolVal || undefined
      }));

      const document: IndexDocument = {
        id: knowledge.id,
        workspaceId: knowledge.workspaceId,
        title: knowledge.title,
        content: plainContent,
        excerpt: knowledge.excerpt || this.generateExcerpt(plainContent),
        status: knowledge.status as KnowledgeStatus,
        author: {
          id: knowledge.author.id,
          displayName: knowledge.author.displayName || knowledge.author.email
        },
        collection: knowledge.collection ? {
          id: knowledge.collection.id,
          name: knowledge.collection.name,
          path: collectionPath
        } : undefined,
        tags: knowledge.tags.map(kt => ({
          id: kt.tag.id,
          name: kt.tag.name,
          color: kt.tag.color || undefined
        })),
        metadata: knowledge.metadata.reduce((acc, m) => {
          const value = m.stringVal || m.numberVal || m.dateVal || m.boolVal;
          if (value !== null) {
            acc[m.keyPath] = value;
          }
          return acc;
        }, {} as Record<string, unknown>),
        facets,
        viewCount: knowledge.viewCount,
        createdAt: knowledge.createdAt.toISOString(),
        updatedAt: knowledge.updatedAt.toISOString()
      };

      return document;
    } catch (error) {
      console.error(`Error projecting knowledge ${knowledgeId} to index:`, error);
      return null;
    }
  }

  /**
   * Get all documents for a workspace (for bulk reindexing)
   */
  async getAllDocuments(workspaceId: string): Promise<IndexDocument[]> {
    const knowledgeItems = await prisma.knowledge.findMany({
      where: { workspaceId },
      include: {
        author: true,
        collection: true,
        tags: {
          include: {
            tag: true
          }
        },
        metadata: true
      }
    });

    const documents = await Promise.all(
      knowledgeItems.map(async (knowledge) => {
        const plainContent = await this.extractPlainText(knowledge.content);
        const collectionPath = knowledge.collection ?
          await this.buildCollectionPath(knowledge.collection.id) : '';

        const facets = knowledge.metadata.map(m => ({
          keyPath: m.keyPath,
          type: m.valueType as 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN',
          stringVal: m.stringVal || undefined,
          numberVal: m.numberVal || undefined,
          dateVal: m.dateVal?.toISOString() || undefined,
          boolVal: m.boolVal || undefined
        }));

        return {
          id: knowledge.id,
          workspaceId: knowledge.workspaceId,
          title: knowledge.title,
          content: plainContent,
          excerpt: knowledge.excerpt || this.generateExcerpt(plainContent),
          status: knowledge.status as KnowledgeStatus,
          author: {
            id: knowledge.author.id,
            displayName: knowledge.author.displayName || knowledge.author.email
          },
          collection: knowledge.collection ? {
            id: knowledge.collection.id,
            name: knowledge.collection.name,
            path: collectionPath
          } : undefined,
          tags: knowledge.tags.map(kt => ({
            id: kt.tag.id,
            name: kt.tag.name,
            color: kt.tag.color || undefined
          })),
          metadata: knowledge.metadata.reduce((acc, m) => {
            const value = m.stringVal || m.numberVal || m.dateVal || m.boolVal;
            if (value !== null) {
              acc[m.keyPath] = value;
            }
            return acc;
          }, {} as Record<string, unknown>),
          facets,
          viewCount: knowledge.viewCount,
          createdAt: knowledge.createdAt.toISOString(),
          updatedAt: knowledge.updatedAt.toISOString()
        };
      })
    );

    return documents;
  }

  /**
   * Extract plain text from markdown content
   */
  private async extractPlainText(markdown: string): Promise<string> {
    try {
      // Convert markdown to HTML
      const html = await marked.parse(markdown, {
        gfm: true,
        breaks: true
      });

      // Parse HTML and extract text
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());

      // Get text content
      let text = document.body.textContent || '';

      // Clean up whitespace
      text = text
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Extract code blocks separately for better indexing
      const codeBlocks = markdown.match(/```[\s\S]*?```/g) || [];
      const codeContent = codeBlocks
        .map(block => block.replace(/```\w*\n?/, '').replace(/```$/, ''))
        .join(' ');

      // Combine text and code
      return `${text} ${codeContent}`.trim();
    } catch (error) {
      console.error('Error extracting plain text:', error);
      // Fallback to simple regex-based extraction
      return markdown
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`[^`]+`/g, '') // Remove inline code
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
        .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // Extract link text
        .replace(/[#*_~]/g, '') // Remove formatting
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  /**
   * Generate an excerpt from content
   */
  private generateExcerpt(content: string, maxLength: number = 200): string {
    if (!content) return '';

    // Remove multiple spaces and newlines
    const cleaned = content.replace(/\s+/g, ' ').trim();

    // If content is shorter than max length, return as is
    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    // Find the last complete sentence within maxLength
    const truncated = cleaned.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );

    if (lastSentenceEnd > 0) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    // Find the last complete word
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * Build collection path from leaf to root
   */
  private async buildCollectionPath(collectionId: string): Promise<string> {
    const path: string[] = [];
    let currentId: string | null = collectionId;

    while (currentId) {
      const collection = await prisma.collection.findUnique({
        where: { id: currentId },
        select: { name: true, parentId: true }
      });

      if (!collection) break;

      path.unshift(collection.name);
      currentId = collection.parentId;
    }

    return path.join(' / ');
  }

  /**
   * Project changes for incremental updates
   */
  async projectChanges(
    knowledgeId: string,
    changes: Partial<{
      title?: string;
      content?: string;
      excerpt?: string;
      status?: string;
      tags?: string[];
      collectionId?: string;
    }>
  ): Promise<Partial<IndexDocument> | null> {
    const updates: Partial<IndexDocument> = {};

    if (changes.title !== undefined) {
      updates.title = changes.title;
    }

    if (changes.content !== undefined) {
      updates.content = await this.extractPlainText(changes.content);
      if (!changes.excerpt) {
        updates.excerpt = this.generateExcerpt(updates.content);
      }
    }

    if (changes.excerpt !== undefined) {
      updates.excerpt = changes.excerpt;
    }

    if (changes.status !== undefined) {
      updates.status = changes.status as KnowledgeStatus;
    }

    if (changes.tags !== undefined) {
      const tags = await prisma.tag.findMany({
        where: {
          id: { in: changes.tags }
        }
      });
      updates.tags = tags.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color || undefined
      }));
    }

    if (changes.collectionId !== undefined) {
      if (changes.collectionId) {
        const collection = await prisma.collection.findUnique({
          where: { id: changes.collectionId }
        });
        if (collection) {
          updates.collection = {
            id: collection.id,
            name: collection.name,
            path: await this.buildCollectionPath(collection.id)
          };
        }
      } else {
        updates.collection = undefined;
      }
    }

    updates.updatedAt = new Date().toISOString();

    return Object.keys(updates).length > 0 ? updates : null;
  }

  /**
   * Extract searchable content from various formats
   */
  async extractSearchableContent(
    content: string,
    contentType: 'markdown' | 'html' | 'plain' = 'markdown'
  ): Promise<string> {
    switch (contentType) {
      case 'markdown':
        return this.extractPlainText(content);

      case 'html':
        const dom = new JSDOM(content);
        return dom.window.document.body.textContent || '';

      case 'plain':
      default:
        return content;
    }
  }
}
import { prisma } from '@/lib/db/prisma'
import type { IndexDocument } from './types'
import { projectKnowledgeToIndex } from './projection'

export class ProjectionService {
  async projectToIndex(knowledgeId: string): Promise<IndexDocument | null> {
    return projectKnowledgeToIndex(knowledgeId)
  }

  async getAllDocuments(workspaceId: string): Promise<IndexDocument[]> {
    const ids = await prisma.knowledge.findMany({ where: { workspaceId }, select: { id: true } })
    const docs = await Promise.all(ids.map((k) => projectKnowledgeToIndex(k.id)))
    return docs.filter((d): d is IndexDocument => !!d)
  }
}
