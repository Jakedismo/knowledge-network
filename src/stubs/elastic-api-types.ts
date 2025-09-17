export type BulkOperationContainer = Record<string, unknown>
export type BulkResponseItem = Record<string, unknown>
export type QueryDslQueryContainer = Record<string, unknown>
export type SearchResponse<TDocument = unknown> = {
  hits: {
    total: number | { value: number }
    hits: Array<{ _source?: TDocument }>
  }
  took: number
}
