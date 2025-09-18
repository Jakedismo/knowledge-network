import type { ActivityEvent, Content } from './types'

let eventCounter = 0

export interface RecommendationDataSource {
  listContent(workspaceId: string): Promise<Content[]>
  listEvents(workspaceId: string): Promise<ActivityEvent[]>
  appendEvent(event: Omit<ActivityEvent, 'id'> & { id?: string }): Promise<ActivityEvent>
}

export class InMemoryRecommendationDataSource implements RecommendationDataSource {
  private contentByWorkspace = new Map<string, Map<string, Content>>()
  private eventsByWorkspace = new Map<string, ActivityEvent[]>()

  async listContent(workspaceId: string): Promise<Content[]> {
    return [...(this.contentByWorkspace.get(workspaceId)?.values() ?? [])]
  }

  async listEvents(workspaceId: string): Promise<ActivityEvent[]> {
    return [...(this.eventsByWorkspace.get(workspaceId) ?? [])].sort((a, b) => b.timestamp - a.timestamp)
  }

  async appendEvent(event: Omit<ActivityEvent, 'id'> & { id?: string }): Promise<ActivityEvent> {
    const persisted: ActivityEvent = { ...event, id: event.id ?? generateEventId() }
    const list = this.eventsByWorkspace.get(persisted.workspaceId) ?? []
    list.push(persisted)
    this.eventsByWorkspace.set(persisted.workspaceId, list)
    return persisted
  }

  async upsertContent(workspaceId: string, doc: Content): Promise<void> {
    const map = this.contentByWorkspace.get(workspaceId) ?? new Map<string, Content>()
    map.set(doc.id, doc)
    this.contentByWorkspace.set(workspaceId, map)
  }
}

function generateEventId(): string {
  eventCounter += 1
  return `evt_${eventCounter.toString(16)}`
}
