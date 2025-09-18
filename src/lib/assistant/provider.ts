import { MockAssistantProvider } from './mockProvider'
import type { AssistantProvider, AssistantProviderOptions } from './types'

export function createAssistantProvider(opts?: Partial<AssistantProviderOptions>): AssistantProvider {
  const mode = opts?.mode ?? (process.env.NEXT_PUBLIC_ASSISTANT_MODE as any) ?? 'mock'
  switch (mode) {
    case 'mock':
    default:
      return new MockAssistantProvider(opts)
  }
}

export * from './types'

