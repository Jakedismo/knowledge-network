import { MockAssistantProvider } from './mockProvider'
import { AgentsAssistantProvider } from './agentsProvider'
import type { AssistantProvider, AssistantProviderOptions } from './types'

export function createAssistantProvider(opts?: Partial<AssistantProviderOptions>): AssistantProvider {
  const mode = opts?.mode ?? (process.env.NEXT_PUBLIC_ASSISTANT_MODE as any) ?? 'mock'
  switch (mode) {
    case 'mock':
    default:
      return new MockAssistantProvider(opts)
    case 'agents':
      return new AgentsAssistantProvider(opts)
  }
}

export * from './types'
