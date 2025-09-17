import { getElasticClient, KNOWLEDGE_INDEX_CONFIG } from './elastic/client'
import { QueryDslQueryContainer, SearchResponse } from '@elastic/elasticsearch/lib/api/types'
import { IndexDocument } from './types'
import { Redis } from 'ioredis'

export interface SearchQuery {
  query: string
  workspaceId: string
  filters?: {
    status?: string[]
    collections?: string[]
    tags?: string[]
    authors?: string[]
    dateRange?: {
      from?: string
      to?: string
    }
  }
  facets?: string[]
  from?: number
  size?: number
  sortBy?: 'relevance' | 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc'
}

export interface SearchResult {
  hits: {
    total: number
    items: Array<{
      document: IndexDocument
      score: number
      highlights?: Record<string, string[]>
    }>
  }
  facets?: Record<string, Array<{ value: string; count: number }>>
  took: number
  query: string
}

export interface SuggestQuery {
  query: string
  workspaceId: string
  size?: number
}

export interface SuggestResult {
  suggestions: Array<{
    text: string
    score: number
  }>
}

// Redis cache for query results (optional)
let cacheClient: Redis | null = null
const CACHE_TTL = 300 // 5 minutes

// Initialize cache if Redis is configured
if (process.env.REDIS_URL) {
  cacheClient = new Redis(process.env.REDIS_URL)
  cacheClient.on('error', (err) => {
    console.error('Redis cache error:', err)
    cacheClient = null // Disable cache on error
  })
}

export class SearchService {
  private client = getElasticClient()

  async search(searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now()

    // Check cache first
    const cacheKey = this.getCacheKey(searchQuery)
    if (cacheClient) {
      const cached = await cacheClient.get(cacheKey)
      if (cached) {
        const result = JSON.parse(cached)
        result.fromCache = true
        return result
      }
    }

    // Build ElasticSearch query
    const esQuery = this.buildElasticQuery(searchQuery)

    // Execute search
    const response = await this.client.search<IndexDocument>({
      index: KNOWLEDGE_INDEX_CONFIG.index,
      body: esQuery
    })

    // Process results
    const result = this.processSearchResponse(response, searchQuery.query)
    result.took = Date.now() - startTime

    // Cache results
    if (cacheClient && result.hits.total > 0) {
      await cacheClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result))
    }

    return result
  }

  private buildElasticQuery(searchQuery: SearchQuery): any {
    const { query, workspaceId, filters, facets, from = 0, size = 10, sortBy = 'relevance' } = searchQuery

    // Build must clauses
    const must: QueryDslQueryContainer[] = [
      { term: { workspaceId } }
    ]

    // Build query clause with boosting
    if (query && query.trim()) {
      must.push({
        bool: {
          should: [
            {
              multi_match: {
                query,
                fields: [
                  'title^3',       // Title has highest weight
                  'contentText^1', // Content has standard weight
                  'excerpt^2',     // Excerpt has medium weight
                  'tags.name^2',   // Tags have medium weight
                  'collection.name^1.5',
                  'author.displayName^1'
                ],
                type: 'best_fields',
                operator: 'or',
                minimum_should_match: '60%'
              }
            },
            {
              // Boost exact matches
              match_phrase: {
                title: {
                  query,
                  boost: 5
                }
              }
            }
          ]
        }
      })
    }

    // Build filter clauses
    const filter: QueryDslQueryContainer[] = []

    if (filters?.status?.length) {
      filter.push({ terms: { status: filters.status } })
    }

    if (filters?.collections?.length) {
      filter.push({ terms: { 'collection.id': filters.collections } })
    }

    if (filters?.tags?.length) {
      filter.push({
        nested: {
          path: 'tags',
          query: {
            terms: { 'tags.id': filters.tags }
          }
        }
      })
    }

    if (filters?.authors?.length) {
      filter.push({ terms: { 'author.id': filters.authors } })
    }

    if (filters?.dateRange) {
      const range: any = {}
      if (filters.dateRange.from) range.gte = filters.dateRange.from
      if (filters.dateRange.to) range.lte = filters.dateRange.to
      filter.push({ range: { updatedAt: range } })
    }

    // Build sort
    let sort: any[] = []
    switch (sortBy) {
      case 'date_desc':
        sort = [{ updatedAt: 'desc' }]
        break
      case 'date_asc':
        sort = [{ updatedAt: 'asc' }]
        break
      case 'title_asc':
        sort = [{ 'title.keyword': 'asc' }]
        break
      case 'title_desc':
        sort = [{ 'title.keyword': 'desc' }]
        break
      case 'relevance':
      default:
        // Use score with tiebreaker
        sort = ['_score', { updatedAt: 'desc' }]
    }

    // Build aggregations for facets
    const aggs: any = {}
    if (facets?.includes('status')) {
      aggs.status = { terms: { field: 'status' } }
    }
    if (facets?.includes('collections')) {
      aggs.collections = {
        terms: {
          field: 'collection.id',
          size: 50
        }
      }
    }
    if (facets?.includes('tags')) {
      aggs.tags = {
        nested: { path: 'tags' },
        aggs: {
          tag_ids: {
            terms: {
              field: 'tags.id',
              size: 100
            }
          }
        }
      }
    }
    if (facets?.includes('authors')) {
      aggs.authors = {
        terms: {
          field: 'author.id',
          size: 50
        }
      }
    }

    // Build highlight configuration
    const highlight = {
      fields: {
        title: {
          fragment_size: 150,
          number_of_fragments: 1
        },
        contentText: {
          fragment_size: 150,
          number_of_fragments: 3
        },
        excerpt: {
          fragment_size: 150,
          number_of_fragments: 1
        }
      },
      pre_tags: ['<mark>'],
      post_tags: ['</mark>']
    }

    // Construct final query
    return {
      from,
      size,
      query: {
        bool: {
          must,
          filter
        }
      },
      sort,
      aggs,
      highlight,
      track_total_hits: true,
      // Performance optimizations
      _source: true,
      explain: false,
      version: false
    }
  }

  private processSearchResponse(response: SearchResponse<IndexDocument>, query: string): SearchResult {
    const hits = response.hits.hits.map(hit => ({
      document: hit._source!,
      score: hit._score || 0,
      highlights: hit.highlight
    }))

    // Process aggregations
    const facets: Record<string, Array<{ value: string; count: number }>> = {}
    if (response.aggregations) {
      if (response.aggregations.status) {
        const statusAgg = response.aggregations.status as any
        facets.status = statusAgg.buckets.map((b: any) => ({
          value: b.key,
          count: b.doc_count
        }))
      }
      if (response.aggregations.collections) {
        const collAgg = response.aggregations.collections as any
        facets.collections = collAgg.buckets.map((b: any) => ({
          value: b.key,
          count: b.doc_count
        }))
      }
      if (response.aggregations.tags) {
        const tagsAgg = response.aggregations.tags as any
        if (tagsAgg.tag_ids) {
          facets.tags = tagsAgg.tag_ids.buckets.map((b: any) => ({
            value: b.key,
            count: b.doc_count
          }))
        }
      }
      if (response.aggregations.authors) {
        const authorsAgg = response.aggregations.authors as any
        facets.authors = authorsAgg.buckets.map((b: any) => ({
          value: b.key,
          count: b.doc_count
        }))
      }
    }

    return {
      hits: {
        total: typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0,
        items: hits
      },
      facets: Object.keys(facets).length > 0 ? facets : undefined,
      took: response.took || 0,
      query
    }
  }

  async suggest(suggestQuery: SuggestQuery): Promise<SuggestResult> {
    const { query, workspaceId, size = 10 } = suggestQuery

    const response = await this.client.search({
      index: KNOWLEDGE_INDEX_CONFIG.index,
      body: {
        suggest: {
          'title-suggest': {
            prefix: query,
            completion: {
              field: 'suggest',
              size,
              skip_duplicates: true,
              fuzzy: {
                fuzziness: 'AUTO'
              },
              contexts: {
                workspace: workspaceId
              }
            }
          }
        },
        _source: false
      }
    })

    const suggestions = response.suggest?.['title-suggest']?.[0]?.options || []

    return {
      suggestions: suggestions.map((opt: any) => ({
        text: opt.text,
        score: opt._score
      }))
    }
  }

  // More like this - find similar documents
  async findSimilar(documentId: string, workspaceId: string, size: number = 5): Promise<SearchResult> {
    const response = await this.client.search<IndexDocument>({
      index: KNOWLEDGE_INDEX_CONFIG.index,
      body: {
        query: {
          bool: {
            must: [
              { term: { workspaceId } },
              {
                more_like_this: {
                  fields: ['title', 'contentText', 'tags.name'],
                  like: [
                    {
                      _index: KNOWLEDGE_INDEX_CONFIG.index,
                      _id: documentId
                    }
                  ],
                  min_term_freq: 1,
                  max_query_terms: 25
                }
              }
            ],
            must_not: [
              { term: { id: documentId } } // Exclude the document itself
            ]
          }
        },
        size
      }
    })

    return this.processSearchResponse(response, `similar:${documentId}`)
  }

  private getCacheKey(query: SearchQuery): string {
    const key = JSON.stringify({
      q: query.query,
      w: query.workspaceId,
      f: query.filters,
      s: query.sortBy,
      p: `${query.from}-${query.size}`
    })
    return `search:${Buffer.from(key).toString('base64')}`
  }

  // Clear cache for a workspace (after updates)
  async clearCache(workspaceId: string): Promise<void> {
    if (!cacheClient) return

    const pattern = `search:*`
    const keys = await cacheClient.keys(pattern)

    // Filter keys for this workspace
    const keysToDelete: string[] = []
    for (const key of keys) {
      const cached = await cacheClient.get(key)
      if (cached) {
        const data = JSON.parse(cached)
        if (data.workspaceId === workspaceId) {
          keysToDelete.push(key)
        }
      }
    }

    if (keysToDelete.length > 0) {
      await cacheClient.del(...keysToDelete)
    }
  }
}

// Singleton instance
let searchService: SearchService | null = null

export function getSearchService(): SearchService {
  if (!searchService) {
    searchService = new SearchService()
  }
  return searchService
}
// @ts-nocheck
