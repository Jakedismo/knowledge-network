import { InMemoryRecommendationDataSource, PrismaRecommendationDataSource, type RecommendationDataSource } from './data-source'
import { RecommendationService } from './service'
import { seedDemoData, DEMO_WORKSPACE_ID } from './demo-data'

let dataSource: RecommendationDataSource | null = null
let service: RecommendationService | null = null
let seeded = false

export function getRecommendationService(): RecommendationService {
  if (!service) {
    dataSource = createDataSource()
    service = new RecommendationService(dataSource)
  }
  maybeSeedDemo()
  return service
}

export function getRecommendationDataSource(): RecommendationDataSource {
  if (!dataSource) {
    getRecommendationService()
  }
  return dataSource!
}

export function isMemoryDataSource(): boolean {
  maybeSeedDemo()
  return dataSource instanceof InMemoryRecommendationDataSource
}

export function getDemoWorkspaceId(): string {
  if (!isMemoryDataSource()) {
    throw new Error('Demo workspace is only available with the in-memory recommendation data source')
  }
  return DEMO_WORKSPACE_ID
}

function createDataSource(): RecommendationDataSource {
  const preference = process.env.RECOMMENDATIONS_DATA_SOURCE ?? (process.env.NODE_ENV === 'test' ? 'memory' : 'prisma')
  if (preference === 'memory') {
    return new InMemoryRecommendationDataSource()
  }
  return new PrismaRecommendationDataSource()
}

function maybeSeedDemo() {
  if (!seeded && dataSource instanceof InMemoryRecommendationDataSource) {
    seedDemoData(dataSource)
    seeded = true
  }
}
