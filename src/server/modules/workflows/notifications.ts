export interface NotificationPublisher {
  stepAssigned(input: { requestId: string; stepIndex: number; assigneeId: string; assigneeType: 'USER' | 'ROLE' }): Promise<void>
  escalationTriggered(input: { requestId: string; stepIndex: number; assigneeId: string }): Promise<void>
}

export class NullNotificationPublisher implements NotificationPublisher {
  async stepAssigned(): Promise<void> { /* noop */ }
  async escalationTriggered(): Promise<void> { /* noop */ }
}

export class SlackNotificationPublisher implements NotificationPublisher {
  private readonly webhook: string | undefined
  constructor(webhookUrl?: string) {
    this.webhook = webhookUrl ?? process.env.SLACK_WEBHOOK_URL
  }
  async stepAssigned(input: { requestId: string; stepIndex: number; assigneeId: string; assigneeType: 'USER' | 'ROLE' }): Promise<void> {
    await this.post({ text: `📝 Review assigned (req=${input.requestId}, step=${input.stepIndex}) → ${input.assigneeType}:${input.assigneeId}` })
  }
  async escalationTriggered(input: { requestId: string; stepIndex: number; assigneeId: string }): Promise<void> {
    await this.post({ text: `⏱️ Escalation triggered (req=${input.requestId}, step=${input.stepIndex}, assignee=${input.assigneeId})` })
  }
  private async post(payload: unknown): Promise<void> {
    if (!this.webhook) return
    try {
      await fetch(this.webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    } catch {
      // swallow in this workspace
    }
  }
}

export class EmailNotificationPublisher implements NotificationPublisher {
  // In this workspace, email is not wired; fallback to console
  async stepAssigned(): Promise<void> { /* noop */ }
  async escalationTriggered(): Promise<void> { /* noop */ }
}

export class CombinedNotificationPublisher implements NotificationPublisher {
  private readonly publishers: NotificationPublisher[]
  constructor(publishers: NotificationPublisher[]) {
    this.publishers = publishers
  }
  async stepAssigned(input: { requestId: string; stepIndex: number; assigneeId: string; assigneeType: 'USER' | 'ROLE' }): Promise<void> {
    await Promise.all(this.publishers.map((p) => p.stepAssigned(input)))
  }
  async escalationTriggered(input: { requestId: string; stepIndex: number; assigneeId: string }): Promise<void> {
    await Promise.all(this.publishers.map((p) => p.escalationTriggered(input)))
  }
}
