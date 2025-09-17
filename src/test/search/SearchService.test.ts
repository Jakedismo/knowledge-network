import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { SearchService } from '@/server/modules/search/SearchService';
import { CacheService } from '@/server/modules/search/CacheService';
import { ProjectionService } from '@/server/modules/search/ProjectionService';
import { QueryBuilder } from '@/server/modules/search/QueryBuilder';
import {
  SearchRequest,
  KnowledgeStatus,
  IndexDocument,
  SearchResponse
} from '@/server/modules/search/types';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    knowledge: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    },
    searchQuery: {
      create: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn().mockImplementation(() => ({
    cluster: {
      health: vi.fn().mockResolvedValue({ status: 'green' })
    },
    search: vi.fn(),
    index: vi.fn(),
    bulk: vi.fn(),
    delete: vi.fn(),
    indices: {
      stats: vi.fn()
    }
  }))
}));

describe('SearchService', () => {
  let searchService: SearchService;
  let mockElasticClient: any;

  beforeAll(() => {
    searchService = new SearchService();
    // Access the mocked ElasticSearch client
    mockElasticClient = (searchService as any).client;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return search results for a valid query', async () => {
      const request: SearchRequest = {
        query: 'typescript',
        workspaceId: 'workspace-123',
        pagination: { page: 1, size: 20 },
        facets: false,
        highlight: true
      };

      const mockResponse = {
        hits: {
          total: { value: 2 },
          hits: [
            {
              _source: {
                id: 'doc-1',
                title: 'TypeScript Guide',
                content: 'Learn TypeScript basics',
                workspaceId: 'workspace-123'
              },
              _score: 1.5,
              highlight: {
                title: ['<mark>TypeScript</mark> Guide'],
                content: ['Learn <mark>TypeScript</mark> basics']
              }
            },
            {
              _source: {
                id: 'doc-2',
                title: 'Advanced TypeScript',
                content: 'Advanced TypeScript patterns',
                workspaceId: 'workspace-123'
              },
              _score: 1.2
            }
          ]
        }
      };

      mockElasticClient.search.mockResolvedValue(mockResponse);

      const result = await searchService.search(request, 'user-123');

      expect(result).toBeDefined();
      expect(result.total).toBe(2);
      expect(result.hits).toHaveLength(2);
      expect(result.hits[0].document.title).toBe('TypeScript Guide');
      expect(result.hits[0].score).toBe(1.5);
      expect(result.hits[0].highlights).toBeDefined();
    });

    it('should handle empty search results', async () => {
      const request: SearchRequest = {
        query: 'nonexistent',
        workspaceId: 'workspace-123'
      };

      mockElasticClient.search.mockResolvedValue({
        hits: {
          total: { value: 0 },
          hits: []
        }
      });

      const result = await searchService.search(request, 'user-123');

      expect(result.total).toBe(0);
      expect(result.hits).toHaveLength(0);
    });

    it('should apply filters correctly', async () => {
      const request: SearchRequest = {
        query: 'content',
        workspaceId: 'workspace-123',
        filters: {
          status: [KnowledgeStatus.PUBLISHED],
          tags: ['javascript', 'typescript'],
          collections: ['collection-1']
        }
      };

      mockElasticClient.search.mockImplementation((params) => {
        // Verify filters are applied
        expect(params.body.query.bool.filter).toBeDefined();
        expect(params.body.query.bool.filter).toContainEqual({
          terms: { status: [KnowledgeStatus.PUBLISHED] }
        });

        return Promise.resolve({
          hits: { total: { value: 0 }, hits: [] }
        });
      });

      await searchService.search(request, 'user-123');
    });

    it('should handle pagination correctly', async () => {
      const request: SearchRequest = {
        query: 'test',
        workspaceId: 'workspace-123',
        pagination: { page: 3, size: 10 }
      };

      mockElasticClient.search.mockImplementation((params) => {
        expect(params.body.from).toBe(20); // (3-1) * 10
        expect(params.body.size).toBe(10);

        return Promise.resolve({
          hits: { total: { value: 100 }, hits: [] }
        });
      });

      await searchService.search(request, 'user-123');
    });

    it('should handle search errors gracefully', async () => {
      const request: SearchRequest = {
        query: 'test',
        workspaceId: 'workspace-123'
      };

      mockElasticClient.search.mockRejectedValue(new Error('ElasticSearch error'));

      await expect(searchService.search(request, 'user-123')).rejects.toThrow('Circuit breaker is OPEN');
    });
  });

  describe('index', () => {
    it('should index a document successfully', async () => {
      const mockDocument: IndexDocument = {
        id: 'doc-123',
        workspaceId: 'workspace-123',
        title: 'Test Document',
        content: 'Test content',
        status: KnowledgeStatus.PUBLISHED,
        author: { id: 'user-1', displayName: 'Test User' },
        tags: [],
        viewCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const projectionService = (searchService as any).projections;
      vi.spyOn(projectionService, 'projectToIndex').mockResolvedValue(mockDocument);

      mockElasticClient.index.mockResolvedValue({ _id: 'doc-123' });

      await searchService.index('doc-123');

      expect(mockElasticClient.index).toHaveBeenCalledWith({
        index: 'knowledge-workspace-123',
        id: 'doc-123',
        body: mockDocument,
        refresh: true
      });
    });

    it('should handle null document projection', async () => {
      const projectionService = (searchService as any).projections;
      vi.spyOn(projectionService, 'projectToIndex').mockResolvedValue(null);

      await searchService.index('doc-123');

      expect(mockElasticClient.index).not.toHaveBeenCalled();
    });
  });

  describe('bulkIndex', () => {
    it('should perform bulk indexing successfully', async () => {
      const operations = [
        {
          operation: 'index' as const,
          document: {
            id: 'doc-1',
            workspaceId: 'workspace-123',
            title: 'Doc 1',
            content: 'Content 1',
            status: KnowledgeStatus.PUBLISHED,
            author: { id: 'user-1', displayName: 'User 1' },
            tags: [],
            viewCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          documentId: 'doc-1',
          workspaceId: 'workspace-123'
        },
        {
          operation: 'delete' as const,
          documentId: 'doc-2',
          workspaceId: 'workspace-123'
        }
      ];

      mockElasticClient.bulk.mockResolvedValue({
        errors: false,
        items: []
      });

      await searchService.bulkIndex(operations);

      expect(mockElasticClient.bulk).toHaveBeenCalled();
      const bulkCall = mockElasticClient.bulk.mock.calls[0][0];
      expect(bulkCall.body).toHaveLength(3); // 2 for index (header + doc), 1 for delete
    });

    it('should handle bulk indexing errors', async () => {
      const operations = [{
        operation: 'index' as const,
        document: {
          id: 'doc-1',
          workspaceId: 'workspace-123',
          title: 'Doc 1',
          content: 'Content',
          status: KnowledgeStatus.PUBLISHED,
          author: { id: 'user-1', displayName: 'User' },
          tags: [],
          viewCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        documentId: 'doc-1',
        workspaceId: 'workspace-123'
      }];

      mockElasticClient.bulk.mockResolvedValue({
        errors: true,
        items: [{
          index: {
            error: {
              type: 'version_conflict',
              reason: 'Document already exists'
            }
          }
        }]
      });

      await searchService.bulkIndex(operations);

      // Should not throw, but log the error
      expect(mockElasticClient.bulk).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a document successfully', async () => {
      mockElasticClient.delete.mockResolvedValue({ _id: 'doc-123' });

      await searchService.delete('doc-123', 'workspace-123');

      expect(mockElasticClient.delete).toHaveBeenCalledWith({
        index: 'knowledge-workspace-123',
        id: 'doc-123',
        refresh: true
      });
    });
  });

  describe('suggest', () => {
    it('should return search suggestions', async () => {
      mockElasticClient.search.mockResolvedValue({
        suggest: {
          title_suggest: [{
            options: [
              { text: 'TypeScript Tutorial' },
              { text: 'TypeScript Guide' },
              { text: 'TypeScript Handbook' }
            ]
          }]
        }
      });

      const suggestions = await searchService.suggest('type', 'workspace-123', 'user-123');

      expect(suggestions).toHaveLength(3);
      expect(suggestions).toContain('TypeScript Tutorial');
    });

    it('should return empty array for no suggestions', async () => {
      mockElasticClient.search.mockResolvedValue({
        suggest: {
          title_suggest: [{
            options: []
          }]
        }
      });

      const suggestions = await searchService.suggest('xyz', 'workspace-123', 'user-123');

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('getMetrics', () => {
    it('should return search metrics', async () => {
      const mockPrisma = await import('@/lib/prisma');

      (mockPrisma.prisma.searchQuery.aggregate as any).mockResolvedValue({
        _avg: { responseTime: 150 },
        _count: 1000
      });

      (mockPrisma.prisma.searchQuery.count as any).mockResolvedValue(50);

      mockElasticClient.indices.stats.mockResolvedValue({
        indices: {
          'knowledge-workspace-123': {
            total: {
              store: { size_in_bytes: 1024000 },
              docs: { count: 500 }
            }
          }
        }
      });

      const metrics = await searchService.getMetrics('workspace-123');

      expect(metrics.avgResponseTime).toBe(150);
      expect(metrics.totalQueries).toBe(1000);
      expect(metrics.zeroResults).toBe(50);
      expect(metrics.documentCount).toBe(500);
    });
  });
});

describe('QueryBuilder', () => {
  let queryBuilder: QueryBuilder;

  beforeEach(() => {
    queryBuilder = new QueryBuilder();
  });

  describe('buildQuery', () => {
    it('should build a basic search query', () => {
      const request: SearchRequest = {
        query: 'test query',
        workspaceId: 'workspace-123'
      };

      const query = queryBuilder.buildQuery(request);

      expect(query.bool.must).toBeDefined();
      expect(query.bool.must[0].multi_match).toBeDefined();
      expect(query.bool.must[0].multi_match.query).toBe('test query');
    });

    it('should build a boolean query', () => {
      const request: SearchRequest = {
        query: 'typescript AND react NOT angular',
        workspaceId: 'workspace-123'
      };

      const query = queryBuilder.buildQuery(request);

      expect(query.bool.must[0].query_string).toBeDefined();
      expect(query.bool.must[0].query_string.query).toContain('AND');
    });

    it('should return match_all for empty query', () => {
      const request: SearchRequest = {
        query: '',
        workspaceId: 'workspace-123'
      };

      const query = queryBuilder.buildQuery(request);

      expect(query.match_all).toBeDefined();
    });
  });

  describe('buildAggregations', () => {
    it('should build facet aggregations', () => {
      const request: SearchRequest = {
        query: 'test',
        workspaceId: 'workspace-123',
        facets: true
      };

      const aggs = queryBuilder.buildAggregations(request);

      expect(aggs.collections).toBeDefined();
      expect(aggs.tags).toBeDefined();
      expect(aggs.authors).toBeDefined();
      expect(aggs.status).toBeDefined();
      expect(aggs.timeline).toBeDefined();
    });
  });

  describe('buildSort', () => {
    it('should build relevance sort', () => {
      const request: SearchRequest = {
        query: 'test',
        workspaceId: 'workspace-123',
        sort: { field: 'relevance', order: 'desc' }
      };

      const sort = queryBuilder.buildSort(request);

      expect(sort[0]._score).toBeDefined();
      expect(sort[0]._score.order).toBe('desc');
    });

    it('should build date sort', () => {
      const request: SearchRequest = {
        query: 'test',
        workspaceId: 'workspace-123',
        sort: { field: 'createdAt', order: 'asc' }
      };

      const sort = queryBuilder.buildSort(request);

      expect(sort[0].createdAt).toBeDefined();
      expect(sort[0].createdAt.order).toBe('asc');
    });

    it('should include default sort', () => {
      const request: SearchRequest = {
        query: 'test',
        workspaceId: 'workspace-123'
      };

      const sort = queryBuilder.buildSort(request);

      expect(sort).toHaveLength(3); // _score, updatedAt, _id
      expect(sort[2]._id).toBeDefined(); // Tiebreaker
    });
  });
});