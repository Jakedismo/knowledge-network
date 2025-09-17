import { WorkflowService } from './workflow.service'
import { CombinedNotificationPublisher, NullNotificationPublisher, SlackNotificationPublisher, EmailNotificationPublisher } from './notifications'

let serviceSingleton: WorkflowService | null = null

export function getWorkflowService(): WorkflowService {
  if (serviceSingleton) return serviceSingleton
  const repo = process.env.WORKFLOWS_REPO?.toLowerCase()
  const notifier = buildNotifier()
  if (repo === 'prisma') {
    // Lazy require to avoid bundling prisma client in all builds
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DbWorkflowService } = require('./db.service') as typeof import('./db.service')
      serviceSingleton = new DbWorkflowService() as unknown as WorkflowService
      return serviceSingleton
    } catch (err) {
      // Fallback to in-memory when prisma adapter is unavailable
      serviceSingleton = new WorkflowService({ notifier })
      return serviceSingleton
    }
  }
  serviceSingleton = new WorkflowService({ notifier })
  return serviceSingleton
}

function buildNotifier() {
  if (process.env.WORKFLOWS_NOTIFY === '1' || process.env.SLACK_WEBHOOK_URL) {
    const pubs = [new SlackNotificationPublisher(), new EmailNotificationPublisher()]
    return new CombinedNotificationPublisher(pubs)
  }
  return new NullNotificationPublisher()
}
