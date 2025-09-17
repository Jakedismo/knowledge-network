// Search Types and Interfaces

export enum KnowledgeStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export interface SearchRequest {
  query: string;
  workspaceId: string;
  filters?: {
    collections?: string[];
    tags?: string[];
    authors?: string[];
    status?: KnowledgeStatus[];
    dateRange?: {
      from?: string;
      to?: string;
    };
    metadata?: Record<string, string[]>;
  };
  sort?: {
    field: 'relevance' | 'createdAt' | 'updatedAt' | 'viewCount' | 'title';
    order: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    size: number;
  };
  facets?: boolean;
  highlight?: boolean;
  includeDebug?: boolean;
}

export interface IndexDocument {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  excerpt?: string;
  status: KnowledgeStatus;
  author: {
    id: string;
    displayName: string;
  };
  collection?: {
    id: string;
    name: string;
    path: string;
  };
  tags: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  metadata?: Record<string, unknown>;
  facets?: IndexDocumentFacet[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  searchVector?: number[];
}

export interface IndexDocumentFacet {
  keyPath: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN';
  stringVal?: string;
  numberVal?: number;
  dateVal?: string;
  boolVal?: boolean;
}

export interface SearchHit {
  document: IndexDocument;
  score: number;
  highlights?: Record<string, string[]>;
}

export interface SearchFacets {
  collections: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color?: string;
    count: number;
  }>;
  authors: Array<{
    id: string;
    displayName: string;
    count: number;
  }>;
  status: Array<{
    status: KnowledgeStatus;
    count: number;
  }>;
  dateRanges?: Array<{
    range: string;
    from: string;
    to: string;
    count: number;
  }>;
}

export interface SearchResponse {
  hits: SearchHit[];
  total: number;
  facets?: SearchFacets;
  took: number;
  debug?: {
    query?: any;
    explanation?: any;
  };
}

export interface SearchSuggestion {
  text: string;
  score: number;
  payload?: {
    id: string;
    type: 'title' | 'tag' | 'author';
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, any>;
  userId: string;
  workspaceId: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchAnalytics {
  queryText: string;
  workspaceId: string;
  userId: string;
  resultCount: number;
  responseTime: number;
  clickedResults: string[];
  timestamp: Date;
  filters?: Record<string, any>;
  sessionId?: string;
}

export interface IndexEvent {
  type: 'UPSERT' | 'DELETE' | 'REINDEX_COLLECTION' | 'REINDEX_TAG' | 'REINDEX_WORKSPACE';
  entityId: string;
  workspaceId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IndexEventHandler {
  handle(event: IndexEvent): Promise<void>;
}

export interface SearchMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  totalQueries: number;
  zeroResults: number;
  errorRate: number;
  cacheHitRate: number;
  indexSize: number;
  documentCount: number;
}

export interface BulkIndexOperation {
  operation: 'index' | 'update' | 'delete';
  document?: IndexDocument;
  documentId: string;
  workspaceId: string;
}

export interface QueryBuilder {
  buildQuery(request: SearchRequest): any;
  buildAggregations(request: SearchRequest): any;
  buildHighlight(request: SearchRequest): any;
  buildSort(request: SearchRequest): any;
}