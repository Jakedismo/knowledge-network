import { Client } from '@elastic/elasticsearch';
import { prisma } from '@/lib/prisma';
import {
  SearchRequest,
  SearchResponse,
  IndexDocument,
  SearchHit,
  SearchFacets,
  BulkIndexOperation,
  SearchMetrics,
  KnowledgeStatus
} from './types';
import { CacheService } from './CacheService';
import { ProjectionService } from './ProjectionService';
import { PermissionService } from '@/lib/auth/permission.service';
import { QueryBuilder } from './QueryBuilder';
import { CircuitBreaker } from './CircuitBreaker';

export class SearchService {
  private client: Client;
  private cache: CacheService;
  private permissions: PermissionService;
  private projections: ProjectionService;
  private queryBuilder: QueryBuilder;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    // Initialize ElasticSearch client
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      } : undefined,
      requestTimeout: 30000,
      maxRetries: 3,
      sniffOnStart: true,
      sniffInterval: 60000
    });

    // Initialize supporting services
    this.cache = new CacheService();
    this.permissions = new PermissionService();
    this.projections = new ProjectionService();
    this.queryBuilder = new QueryBuilder();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000
    });

    // Verify connection on startup
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      const health = await this.client.cluster.health();
      console.log('✅ ElasticSearch connection established:', health.status);
    } catch (error) {
      console.error('❌ ElasticSearch connection failed:', error);
    }
  }

  /**
   * Main search method with permission filtering and caching
   */
  async search(request: SearchRequest, userId: string): Promise<SearchResponse> {
    return await this.circuitBreaker.execute(async () => {
      // 1. Check cache for identical query
      const cacheKey = this.getCacheKey(request, userId);
      const cached = await this.cache.get(cacheKey);
      if (cached && !request.includeDebug) {
        return cached;
      }

      // 2. Build permission filters
      const permissionFilters = await this.buildPermissionFilters(userId, request.workspaceId);

      // 3. Build ElasticSearch query
      const esQuery = await this.buildElasticSearchQuery(request, permissionFilters);

      // 4. Execute search
      const startTime = Date.now();
      const response = await this.client.search(esQuery);
      const took = Date.now() - startTime;

      // 5. Transform response
      const result = await this.transformResponse(response, took, request);

      // 6. Cache result (skip if debug mode)
      if (!request.includeDebug) {
        await this.cache.set(cacheKey, result, 60);
      }

      // 7. Log analytics asynchronously
      this.logSearchAnalytics(request, result, userId, took);

      return result;
    });
  }

  /**
   * Index a single document
   */
  async index(knowledgeId: string): Promise<void> {
    const document = await this.projections.projectToIndex(knowledgeId);
    if (!document) {
      console.warn(`Document ${knowledgeId} could not be projected for indexing`);
      return;
    }

    const indexName = this.getIndexName(document.workspaceId);

    await this.circuitBreaker.execute(async () => {
      await this.client.index({
        index: indexName,
        id: document.id,
        body: document,
        refresh: true // Make it immediately searchable
      });
    });

    // Clear cache for this workspace
    await this.cache.clearWorkspace(document.workspaceId);
  }

  /**
   * Bulk index multiple documents
   */
  async bulkIndex(operations: BulkIndexOperation[]): Promise<void> {
    if (operations.length === 0) return;

    const bulkBody = [];
    const workspaceIds = new Set<string>();

    for (const op of operations) {
      workspaceIds.add(op.workspaceId);
      const indexName = this.getIndexName(op.workspaceId);

      switch (op.operation) {
        case 'index':
        case 'update':
          if (op.document) {
            bulkBody.push({ index: { _index: indexName, _id: op.documentId } });
            bulkBody.push(op.document);
          }
          break;
        case 'delete':
          bulkBody.push({ delete: { _index: indexName, _id: op.documentId } });
          break;
      }
    }

    if (bulkBody.length > 0) {
      await this.circuitBreaker.execute(async () => {
        const result = await this.client.bulk({
          body: bulkBody,
          refresh: true
        });

        if (result.errors) {
          console.error('Bulk indexing errors:', result.items.filter(item => item.index?.error));
        }
      });

      // Clear cache for affected workspaces
      for (const workspaceId of workspaceIds) {
        await this.cache.clearWorkspace(workspaceId);
      }
    }
  }

  /**
   * Delete a document from the index
   */
  async delete(knowledgeId: string, workspaceId: string): Promise<void> {
    const indexName = this.getIndexName(workspaceId);

    await this.circuitBreaker.execute(async () => {
      await this.client.delete({
        index: indexName,
        id: knowledgeId,
        refresh: true
      });
    });

    // Clear cache for this workspace
    await this.cache.clearWorkspace(workspaceId);
  }

  /**
   * Get search suggestions for autocomplete
   */
  async suggest(query: string, workspaceId: string, userId: string): Promise<string[]> {
    // Check permissions
    const hasAccess = await this.permissions.checkWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      return [];
    }

    const indexName = this.getIndexName(workspaceId);

    const response = await this.client.search({
      index: indexName,
      body: {
        suggest: {
          title_suggest: {
            text: query,
            completion: {
              field: "title.suggest",
              size: 10,
              skip_duplicates: true,
              fuzzy: {
                fuzziness: "AUTO"
              }
            }
          }
        },
        _source: false
      }
    });

    const suggestions = response.suggest?.title_suggest?.[0]?.options || [];
    return suggestions.map((opt: any) => opt.text);
  }

  /**
   * Get facets for a workspace (for filter UI)
   */
  async getFacets(workspaceId: string, userId: string): Promise<SearchFacets> {
    const hasAccess = await this.permissions.checkWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new Error('Unauthorized workspace access');
    }

    const cacheKey = `facets:${workspaceId}:${userId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const indexName = this.getIndexName(workspaceId);
    const permissionFilters = await this.buildPermissionFilters(userId, workspaceId);

    const response = await this.client.search({
      index: indexName,
      body: {
        size: 0,
        query: {
          bool: {
            filter: permissionFilters
          }
        },
        aggs: this.queryBuilder.buildAggregations({ workspaceId } as SearchRequest)
      }
    });

    const facets = this.transformAggregations(response.aggregations);
    await this.cache.set(cacheKey, facets, 300); // Cache for 5 minutes
    return facets;
  }

  /**
   * Build ElasticSearch query from search request
   */
  private async buildElasticSearchQuery(
    request: SearchRequest,
    permissionFilters: any[]
  ): Promise<any> {
    const indexName = this.getIndexName(request.workspaceId);

    const query = this.queryBuilder.buildQuery(request);
    const aggs = request.facets ? this.queryBuilder.buildAggregations(request) : undefined;
    const highlight = request.highlight ? this.queryBuilder.buildHighlight(request) : undefined;
    const sort = this.queryBuilder.buildSort(request);

    // Merge permission filters with query filters
    const finalQuery = {
      bool: {
        ...query.bool,
        filter: [...(query.bool?.filter || []), ...permissionFilters]
      }
    };

    const body: any = {
      query: finalQuery,
      from: ((request.pagination?.page || 1) - 1) * (request.pagination?.size || 20),
      size: request.pagination?.size || 20,
      track_total_hits: true
    };

    if (aggs) body.aggs = aggs;
    if (highlight) body.highlight = highlight;
    if (sort) body.sort = sort;

    // Add debug information if requested
    if (request.includeDebug) {
      body.explain = true;
    }

    return {
      index: indexName,
      body
    };
  }

  /**
   * Build permission filters for the current user
   */
  private async buildPermissionFilters(
    userId: string,
    workspaceId: string
  ): Promise<any[]> {
    const filters: any[] = [
      { term: { workspaceId } }
    ];

    // Get user role and permissions
    const userPermissions = await this.permissions.getUserPermissions(userId, workspaceId);

    // If user is viewer, only show published content
    if (userPermissions.role === 'VIEWER') {
      filters.push({ term: { status: KnowledgeStatus.PUBLISHED } });
    }

    // Get accessible collections
    const accessibleCollections = await this.permissions.getUserCollections(userId, workspaceId);
    if (accessibleCollections.length > 0 && accessibleCollections.length < 100) {
      // Only add collection filter if user has limited access
      filters.push({
        terms: { "collection.id": accessibleCollections }
      });
    }

    return filters;
  }

  /**
   * Transform ElasticSearch response to our format
   */
  private async transformResponse(
    response: any,
    took: number,
    request: SearchRequest
  ): Promise<SearchResponse> {
    const hits: SearchHit[] = response.hits.hits.map((hit: any) => ({
      document: hit._source,
      score: hit._score,
      highlights: hit.highlight,
      explanation: request.includeDebug ? hit._explanation : undefined
    }));

    const result: SearchResponse = {
      hits,
      total: response.hits.total.value,
      took
    };

    if (request.facets && response.aggregations) {
      result.facets = this.transformAggregations(response.aggregations);
    }

    if (request.includeDebug) {
      result.debug = {
        query: response.body?.query,
        explanation: response.hits.hits[0]?._explanation
      };
    }

    return result;
  }

  /**
   * Transform aggregations to facets
   */
  private transformAggregations(aggs: any): SearchFacets {
    return {
      collections: (aggs.collections?.buckets || []).map((b: any) => ({
        id: b.key,
        name: b.collection_name?.buckets[0]?.key || b.key,
        count: b.doc_count
      })),
      tags: (aggs.tags?.tag_names?.buckets || []).map((b: any) => ({
        id: b.key,
        name: b.key,
        count: b.doc_count
      })),
      authors: (aggs.authors?.buckets || []).map((b: any) => ({
        id: b.key,
        displayName: b.author_name?.buckets[0]?.key || 'Unknown',
        count: b.doc_count
      })),
      status: (aggs.status?.buckets || []).map((b: any) => ({
        status: b.key as KnowledgeStatus,
        count: b.doc_count
      }))
    };
  }

  /**
   * Get index name for a workspace
   */
  private getIndexName(workspaceId: string): string {
    return `knowledge-${workspaceId}`;
  }

  /**
   * Generate cache key for a search request
   */
  private getCacheKey(request: SearchRequest, userId: string): string {
    const key = {
      query: request.query,
      filters: request.filters,
      sort: request.sort,
      pagination: request.pagination,
      workspaceId: request.workspaceId,
      userId
    };
    return `search:${JSON.stringify(key)}`;
  }

  /**
   * Log search analytics asynchronously
   */
  private async logSearchAnalytics(
    request: SearchRequest,
    response: SearchResponse,
    userId: string,
    took: number
  ): Promise<void> {
    try {
      await prisma.searchQuery.create({
        data: {
          query: request.query || '',
          filters: request.filters || {},
          resultCount: response.total,
          responseTime: took,
          userId,
          workspaceId: request.workspaceId
        }
      });
    } catch (error) {
      console.error('Failed to log search analytics:', error);
    }
  }

  /**
   * Get search metrics for monitoring
   */
  async getMetrics(workspaceId?: string): Promise<SearchMetrics> {
    const where = workspaceId ? { workspaceId } : {};

    const [metrics, indexStats] = await Promise.all([
      prisma.searchQuery.aggregate({
        where,
        _avg: { responseTime: true },
        _count: true
      }),
      this.getIndexStats(workspaceId)
    ]);

    const zeroResults = await prisma.searchQuery.count({
      where: { ...where, resultCount: 0 }
    });

    return {
      avgResponseTime: metrics._avg.responseTime || 0,
      p95ResponseTime: 0, // Would need percentile calculation
      totalQueries: metrics._count,
      zeroResults,
      errorRate: 0, // Would need error tracking
      cacheHitRate: await this.cache.getHitRate(),
      indexSize: indexStats.size,
      documentCount: indexStats.count
    };
  }

  /**
   * Get index statistics
   */
  private async getIndexStats(workspaceId?: string): Promise<{ size: number; count: number }> {
    try {
      const index = workspaceId ? this.getIndexName(workspaceId) : 'knowledge-*';
      const stats = await this.client.indices.stats({ index });

      const size = Object.values(stats.indices || {}).reduce(
        (sum: number, idx: any) => sum + (idx.total?.store?.size_in_bytes || 0), 0
      );
      const count = Object.values(stats.indices || {}).reduce(
        (sum: number, idx: any) => sum + (idx.total?.docs?.count || 0), 0
      );

      return { size, count };
    } catch {
      return { size: 0, count: 0 };
    }
  }

  /**
   * Reindex all documents for a workspace
   */
  async reindexWorkspace(workspaceId: string): Promise<void> {
    console.log(`Starting reindex for workspace ${workspaceId}`);

    const documents = await this.projections.getAllDocuments(workspaceId);
    const operations: BulkIndexOperation[] = documents.map(doc => ({
      operation: 'index',
      document: doc,
      documentId: doc.id,
      workspaceId: doc.workspaceId
    }));

    // Process in batches of 100
    for (let i = 0; i < operations.length; i += 100) {
      const batch = operations.slice(i, i + 100);
      await this.bulkIndex(batch);
      console.log(`Reindexed ${Math.min(i + 100, operations.length)}/${operations.length} documents`);
    }

    await this.cache.clearWorkspace(workspaceId);
    console.log(`Reindex complete for workspace ${workspaceId}`);
  }
}