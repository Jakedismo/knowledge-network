#!/usr/bin/env node

import { getSearchService } from './search.service'
import { getElasticClient, initializeIndex, KNOWLEDGE_INDEX_CONFIG } from './elastic/client'
import { performanceMonitor } from './monitoring'
import { faker } from '@faker-js/faker'

interface BenchmarkConfig {
  documentCount: number
  queryCount: number
  concurrentQueries: number
  workspaceId: string
}

interface BenchmarkResults {
  indexing: {
    totalTime: number
    documentsPerSecond: number
    averageLatency: number
  }
  search: {
    totalQueries: number
    successfulQueries: number
    failedQueries: number
    averageLatency: number
    p50Latency: number
    p95Latency: number
    p99Latency: number
    queriesPerSecond: number
  }
  cache: {
    hitRatio: number
    missCount: number
  }
}

class SearchBenchmark {
  private client = getElasticClient()
  private searchService = getSearchService()

  async run(config: BenchmarkConfig): Promise<BenchmarkResults> {
    console.log('🚀 Starting search benchmark...')
    console.log(`   Documents: ${config.documentCount}`)
    console.log(`   Queries: ${config.queryCount}`)
    console.log(`   Concurrent: ${config.concurrentQueries}`)

    // Initialize index
    await initializeIndex()

    // Generate and index test documents
    console.log('\n📝 Generating test documents...')
    const indexResults = await this.benchmarkIndexing(config)

    // Wait for documents to be searchable
    await this.refreshIndex()
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Run search benchmarks
    console.log('\n🔍 Running search benchmarks...')
    const searchResults = await this.benchmarkSearch(config)

    // Clean up test data
    if (process.env.BENCHMARK_CLEANUP !== 'false') {
      console.log('\n🧹 Cleaning up test data...')
      await this.cleanup(config.workspaceId)
    }

    const results: BenchmarkResults = {
      indexing: indexResults,
      search: searchResults,
      cache: {
        hitRatio: 0, // Will be populated from monitoring
        missCount: 0
      }
    }

    this.printResults(results)
    return results
  }

  private async benchmarkIndexing(config: BenchmarkConfig) {
    const documents = this.generateTestDocuments(config.documentCount, config.workspaceId)
    const startTime = Date.now()
    const batchSize = 100
    let indexed = 0

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      const operations: any[] = []

      for (const doc of batch) {
        operations.push({ index: { _index: KNOWLEDGE_INDEX_CONFIG.index, _id: doc.id } })
        operations.push(doc)
      }

      await this.client.bulk({ body: operations, refresh: false })
      indexed += batch.length

      if (indexed % 1000 === 0) {
        console.log(`   Indexed ${indexed}/${config.documentCount} documents`)
      }
    }

    const totalTime = Date.now() - startTime
    return {
      totalTime,
      documentsPerSecond: (config.documentCount / totalTime) * 1000,
      averageLatency: totalTime / config.documentCount
    }
  }

  private async benchmarkSearch(config: BenchmarkConfig) {
    const queries = this.generateTestQueries(config.queryCount)
    const latencies: number[] = []
    let successful = 0
    let failed = 0

    const startTime = Date.now()

    // Run queries in batches for concurrency
    const batchSize = config.concurrentQueries
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize)
      const promises = batch.map(async query => {
        const queryStart = Date.now()
        try {
          const result = await this.searchService.search({
            query,
            workspaceId: config.workspaceId,
            from: 0,
            size: 10
          })
          const latency = Date.now() - queryStart
          latencies.push(latency)
          successful++

          // Check if we meet our <500ms requirement
          if (latency > 500) {
            console.warn(`   ⚠️ Slow query (${latency}ms): "${query}"`)
          }

          return result
        } catch (error) {
          failed++
          console.error(`   ❌ Query failed: "${query}"`)
          throw error
        }
      })

      await Promise.allSettled(promises)

      if ((i + batchSize) % 100 === 0) {
        console.log(`   Executed ${Math.min(i + batchSize, config.queryCount)}/${config.queryCount} queries`)
      }
    }

    const totalTime = Date.now() - startTime
    latencies.sort((a, b) => a - b)

    return {
      totalQueries: config.queryCount,
      successfulQueries: successful,
      failedQueries: failed,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50Latency: latencies[Math.floor(latencies.length * 0.5)],
      p95Latency: latencies[Math.floor(latencies.length * 0.95)],
      p99Latency: latencies[Math.floor(latencies.length * 0.99)],
      queriesPerSecond: (config.queryCount / totalTime) * 1000
    }
  }

  private generateTestDocuments(count: number, workspaceId: string) {
    const documents = []
    const collections = Array(10).fill(null).map(() => ({
      id: faker.string.uuid(),
      name: faker.company.name()
    }))
    const tags = Array(20).fill(null).map(() => ({
      id: faker.string.uuid(),
      name: faker.word.noun(),
      color: faker.color.human()
    }))
    const authors = Array(5).fill(null).map(() => ({
      id: faker.string.uuid(),
      displayName: faker.person.fullName()
    }))

    for (let i = 0; i < count; i++) {
      documents.push({
        id: faker.string.uuid(),
        workspaceId,
        title: faker.lorem.sentence(),
        contentText: faker.lorem.paragraphs(faker.number.int({ min: 1, max: 10 })),
        excerpt: faker.lorem.paragraph(),
        status: faker.helpers.arrayElement(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']),
        author: faker.helpers.arrayElement(authors),
        collection: faker.helpers.arrayElement(collections),
        collectionPath: [],
        tags: faker.helpers.arrayElements(tags, faker.number.int({ min: 0, max: 5 })),
        metadata: {},
        facets: [],
        createdAt: faker.date.past().toISOString(),
        updatedAt: faker.date.recent().toISOString(),
        suggest: [faker.lorem.word(), faker.lorem.word()]
      })
    }

    return documents
  }

  private generateTestQueries(count: number): string[] {
    const queries = []

    // Mix of different query types
    const queryTypes = [
      () => faker.lorem.word(), // Single word
      () => faker.lorem.words(2), // Two words
      () => faker.lorem.words(3), // Three words
      () => `"${faker.lorem.words(2)}"`, // Phrase query
      () => faker.person.firstName(), // Name search
      () => faker.company.name(), // Company search
      () => faker.word.noun(), // Noun search
      () => faker.lorem.sentence().slice(0, 30), // Partial sentence
    ]

    for (let i = 0; i < count; i++) {
      const queryType = faker.helpers.arrayElement(queryTypes)
      queries.push(queryType())
    }

    return queries
  }

  private async refreshIndex(): Promise<void> {
    await this.client.indices.refresh({ index: KNOWLEDGE_INDEX_CONFIG.index })
  }

  private async cleanup(workspaceId: string): Promise<void> {
    await this.client.deleteByQuery({
      index: KNOWLEDGE_INDEX_CONFIG.index,
      body: {
        query: {
          term: { workspaceId }
        }
      }
    })
  }

  private printResults(results: BenchmarkResults): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 BENCHMARK RESULTS')
    console.log('='.repeat(60))

    console.log('\n🔤 INDEXING PERFORMANCE')
    console.log(`   Total Time: ${(results.indexing.totalTime / 1000).toFixed(2)}s`)
    console.log(`   Documents/Second: ${results.indexing.documentsPerSecond.toFixed(0)}`)
    console.log(`   Average Latency: ${results.indexing.averageLatency.toFixed(2)}ms`)

    console.log('\n🔍 SEARCH PERFORMANCE')
    console.log(`   Total Queries: ${results.search.totalQueries}`)
    console.log(`   Successful: ${results.search.successfulQueries}`)
    console.log(`   Failed: ${results.search.failedQueries}`)
    console.log(`   QPS: ${results.search.queriesPerSecond.toFixed(2)}`)
    console.log(`   Average Latency: ${results.search.averageLatency.toFixed(2)}ms`)
    console.log(`   P50 Latency: ${results.search.p50Latency}ms`)
    console.log(`   P95 Latency: ${results.search.p95Latency}ms`)
    console.log(`   P99 Latency: ${results.search.p99Latency}ms`)

    console.log('\n✅ PERFORMANCE REQUIREMENTS')
    const meetsLatency = results.search.p99Latency < 500
    const meetsQPS = results.search.queriesPerSecond > 10
    console.log(`   P99 < 500ms: ${meetsLatency ? '✅' : '❌'} (${results.search.p99Latency}ms)`)
    console.log(`   QPS > 10: ${meetsQPS ? '✅' : '❌'} (${results.search.queriesPerSecond.toFixed(2)})`)

    if (meetsLatency && meetsQPS) {
      console.log('\n🎉 All performance requirements met!')
    } else {
      console.log('\n⚠️ Some performance requirements not met. Consider optimization.')
    }

    console.log('\n' + '='.repeat(60))
  }
}

// CLI execution
if (require.main === module) {
  const benchmark = new SearchBenchmark()

  const config: BenchmarkConfig = {
    documentCount: parseInt(process.env.BENCHMARK_DOCS || '10000'),
    queryCount: parseInt(process.env.BENCHMARK_QUERIES || '1000'),
    concurrentQueries: parseInt(process.env.BENCHMARK_CONCURRENT || '10'),
    workspaceId: process.env.BENCHMARK_WORKSPACE || 'bench-' + Date.now()
  }

  benchmark.run(config)
    .then(() => {
      console.log('\n✨ Benchmark complete!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Benchmark failed:', error)
      process.exit(1)
    })
}

export { SearchBenchmark, BenchmarkConfig, BenchmarkResults }