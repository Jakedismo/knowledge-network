import { SearchRequest, QueryBuilder as IQueryBuilder } from './types';

export class QueryBuilder implements IQueryBuilder {
  /**
   * Build the main search query
   */
  buildQuery(request: SearchRequest): any {
    const must: any[] = [];
    const filter: any[] = [];
    const should: any[] = [];
    const mustNot: any[] = [];

    // Add main search query
    if (request.query && request.query.trim() !== '') {
      // Check if it's a boolean query
      if (this.isBooleanQuery(request.query)) {
        must.push(this.buildBooleanQuery(request.query));
      } else {
        // Standard multi-match query
        must.push({
          multi_match: {
            query: request.query,
            fields: [
              'title^3',           // Title has highest boost
              'excerpt^2',         // Excerpt has medium boost
              'content',           // Full content
              'tags.name^1.5',     // Tags have some boost
              'author.displayName' // Author name
            ],
            type: 'best_fields',
            operator: 'or',
            fuzziness: 'AUTO',
            prefix_length: 2,
            max_expansions: 50
          }
        });

        // Add phrase matching for better relevance
        should.push({
          match_phrase: {
            content: {
              query: request.query,
              boost: 2
            }
          }
        });
      }
    }

    // Add filters
    if (request.filters) {
      // Collection filter
      if (request.filters.collections?.length) {
        filter.push({
          terms: { 'collection.id': request.filters.collections }
        });
      }

      // Tags filter (nested)
      if (request.filters.tags?.length) {
        filter.push({
          nested: {
            path: 'tags',
            query: {
              terms: { 'tags.name': request.filters.tags }
            }
          }
        });
      }

      // Authors filter
      if (request.filters.authors?.length) {
        filter.push({
          terms: { 'author.id': request.filters.authors }
        });
      }

      // Status filter
      if (request.filters.status?.length) {
        filter.push({
          terms: { status: request.filters.status }
        });
      }

      // Date range filter
      if (request.filters.dateRange) {
        const range: any = {};
        if (request.filters.dateRange.from) {
          range.gte = request.filters.dateRange.from;
        }
        if (request.filters.dateRange.to) {
          range.lte = request.filters.dateRange.to;
        }
        if (Object.keys(range).length > 0) {
          filter.push({ range: { createdAt: range } });
        }
      }

      // Metadata filters
      if (request.filters.metadata) {
        for (const [key, values] of Object.entries(request.filters.metadata)) {
          if (values && values.length > 0) {
            filter.push({
              terms: { [`metadata.${key}`]: values }
            });
          }
        }
      }
    }

    // Build final query
    const query: any = {
      bool: {}
    };

    if (must.length > 0) query.bool.must = must;
    if (filter.length > 0) query.bool.filter = filter;
    if (should.length > 0) {
      query.bool.should = should;
      query.bool.minimum_should_match = 0;
    }
    if (mustNot.length > 0) query.bool.must_not = mustNot;

    // If no query specified, match all
    if (Object.keys(query.bool).length === 0) {
      return { match_all: {} };
    }

    return query;
  }

  /**
   * Build aggregations for faceted search
   */
  buildAggregations(request: SearchRequest): any {
    const aggs: any = {};

    // Collection aggregation with name
    aggs.collections = {
      terms: {
        field: 'collection.id',
        size: 50
      },
      aggs: {
        collection_name: {
          terms: {
            field: 'collection.name.keyword',
            size: 1
          }
        }
      }
    };

    // Tags aggregation (nested)
    aggs.tags = {
      nested: {
        path: 'tags'
      },
      aggs: {
        tag_names: {
          terms: {
            field: 'tags.name',
            size: 100
          },
          aggs: {
            tag_colors: {
              terms: {
                field: 'tags.color',
                size: 1
              }
            }
          }
        }
      }
    };

    // Authors aggregation with display name
    aggs.authors = {
      terms: {
        field: 'author.id',
        size: 50
      },
      aggs: {
        author_name: {
          terms: {
            field: 'author.displayName.keyword',
            size: 1
          }
        }
      }
    };

    // Status aggregation
    aggs.status = {
      terms: {
        field: 'status',
        size: 10
      }
    };

    // Date histogram for timeline
    aggs.timeline = {
      date_histogram: {
        field: 'createdAt',
        calendar_interval: '1d',
        min_doc_count: 1
      }
    };

    // Stats for numeric fields
    aggs.view_stats = {
      stats: {
        field: 'viewCount'
      }
    };

    return aggs;
  }

  /**
   * Build highlight configuration
   */
  buildHighlight(request: SearchRequest): any {
    const highlightFields: any = {
      title: {
        type: 'unified',
        number_of_fragments: 0,
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      },
      content: {
        type: 'unified',
        fragment_size: 150,
        number_of_fragments: 3,
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      },
      excerpt: {
        type: 'unified',
        fragment_size: 200,
        number_of_fragments: 1,
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      }
    };

    // Add tag highlighting if searching in tags
    if (request.query && request.filters?.tags?.length) {
      highlightFields['tags.name'] = {
        type: 'unified',
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      };
    }

    return {
      fields: highlightFields,
      encoder: 'html',
      highlight_query: request.query ? {
        multi_match: {
          query: request.query,
          fields: ['title', 'content', 'excerpt', 'tags.name']
        }
      } : undefined
    };
  }

  /**
   * Build sort configuration
   */
  buildSort(request: SearchRequest): any[] {
    const sort: any[] = [];

    if (request.sort) {
      switch (request.sort.field) {
        case 'relevance':
          // Default ES scoring
          sort.push({ _score: { order: 'desc' } });
          break;
        case 'createdAt':
          sort.push({ createdAt: { order: request.sort.order || 'desc' } });
          break;
        case 'updatedAt':
          sort.push({ updatedAt: { order: request.sort.order || 'desc' } });
          break;
        case 'viewCount':
          sort.push({ viewCount: { order: request.sort.order || 'desc' } });
          break;
        case 'title':
          sort.push({ 'title.keyword': { order: request.sort.order || 'asc' } });
          break;
      }
    } else {
      // Default sort: relevance then recency
      sort.push({ _score: { order: 'desc' } });
      sort.push({ updatedAt: { order: 'desc' } });
    }

    // Always add _id as tiebreaker for consistent pagination
    sort.push({ _id: { order: 'asc' } });

    return sort;
  }

  /**
   * Check if query contains boolean operators
   */
  private isBooleanQuery(query: string): boolean {
    const booleanOperators = /\b(AND|OR|NOT)\b/;
    return booleanOperators.test(query);
  }

  /**
   * Build a boolean query with AND, OR, NOT operators
   */
  private buildBooleanQuery(query: string): any {
    // Convert boolean operators to ElasticSearch query_string format
    const processedQuery = query
      .replace(/\bAND\b/g, ' AND ')
      .replace(/\bOR\b/g, ' OR ')
      .replace(/\bNOT\b/g, ' -')
      .trim();

    return {
      query_string: {
        query: processedQuery,
        default_field: 'content',
        fields: ['title^3', 'content', 'excerpt^2', 'tags.name'],
        default_operator: 'OR',
        analyze_wildcard: true,
        allow_leading_wildcard: false,
        fuzzy_max_expansions: 50,
        fuzzy_prefix_length: 2,
        phrase_slop: 2,
        boost: 1.0
      }
    };
  }

  /**
   * Build a more_like_this query for finding similar documents
   */
  buildMoreLikeThisQuery(documentId: string, workspaceId: string): any {
    return {
      more_like_this: {
        fields: ['title', 'content', 'tags.name'],
        like: [
          {
            _index: `knowledge-${workspaceId}`,
            _id: documentId
          }
        ],
        min_term_freq: 2,
        min_doc_freq: 5,
        max_query_terms: 25,
        min_word_length: 3,
        stop_words: '_english_'
      }
    };
  }

  /**
   * Build a suggestion query for autocomplete
   */
  buildSuggestionQuery(prefix: string): any {
    return {
      suggest: {
        title_suggest: {
          prefix: prefix,
          completion: {
            field: 'title.suggest',
            size: 10,
            skip_duplicates: true,
            fuzzy: {
              fuzziness: 'AUTO'
            }
          }
        }
      },
      _source: false
    };
  }

  /**
   * Build a query for search analytics
   */
  buildAnalyticsQuery(workspaceId: string, days: number = 7): any {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    return {
      query: {
        bool: {
          filter: [
            { term: { workspaceId } },
            {
              range: {
                createdAt: {
                  gte: dateFrom.toISOString()
                }
              }
            }
          ]
        }
      },
      size: 0,
      aggs: {
        popular_terms: {
          significant_terms: {
            field: 'content',
            size: 20
          }
        },
        trending_documents: {
          terms: {
            field: 'id',
            size: 10,
            order: { view_count: 'desc' }
          },
          aggs: {
            view_count: {
              sum: { field: 'viewCount' }
            },
            title: {
              terms: {
                field: 'title.keyword',
                size: 1
              }
            }
          }
        },
        active_authors: {
          terms: {
            field: 'author.id',
            size: 10
          }
        }
      }
    };
  }
}