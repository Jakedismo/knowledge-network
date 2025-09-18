import { InMemoryRecommendationDataSource } from './data-source'
import { RecommendationService } from './service'
import { seedDemoData, DEMO_WORKSPACE_ID } from './demo-data'

let dataSource: InMemoryRecommendationDataSource | null = null
let service: RecommendationService | null = null
let seeded = false

export function getRecommendationService(): RecommendationService {
  if (!service) {
    dataSource = new InMemoryRecommendationDataSource()
    service = new RecommendationService(dataSource)
  }
  if (!seeded && dataSource) {
    seedDemoData(dataSource)
    seeded = true
  }
  return service
}

export function getRecommendationDataSource(): InMemoryRecommendationDataSource {
  if (!dataSource) {
    getRecommendationService()
  }
  // dataSource set in getRecommendationService
  return dataSource!
}

export function getDemoWorkspaceId(): string {
  return DEMO_WORKSPACE_ID
}

