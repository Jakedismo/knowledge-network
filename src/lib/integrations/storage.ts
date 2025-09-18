import { cloneDefaultIntegrationState } from './default-state'
import type { IntegrationDefinition, IntegrationStateSnapshot } from './types'

const STORAGE_KEY = 'kn:integrations:state:v1'

const RUNTIME_FIELDS: (keyof IntegrationDefinition)[] = [
  'enabled',
  'status',
  'config',
  'lastSync',
  'usage',
  'connectedAt',
]

const pickRuntimeState = (integration: Partial<IntegrationDefinition> | undefined) => {
  if (!integration) {
    return {}
  }

  return RUNTIME_FIELDS.reduce<Partial<IntegrationDefinition>>((acc, field) => {
    if (typeof integration[field] !== 'undefined') {
      acc[field] = integration[field]
    }
    return acc
  }, {})
}

const mergeIntegrations = (
  saved: Partial<IntegrationDefinition>[] | undefined
): IntegrationDefinition[] => {
  const defaults = cloneDefaultIntegrationState().integrations
  const savedMap = new Map(saved?.map(integration => [integration.id, integration]))

  const merged = defaults.map(defaultIntegration => {
    const runtimeState = pickRuntimeState(savedMap.get(defaultIntegration.id))
    return {
      ...defaultIntegration,
      ...runtimeState,
    }
  })

  if (saved) {
    for (const integration of saved) {
      if (!integration.id) continue
      if (!merged.some(item => item.id === integration.id)) {
        merged.push({
          ...integration,
          enabled: integration.enabled ?? false,
          status: integration.status ?? 'disconnected',
          type: integration.type ?? 'api_key',
          config: integration.config ?? {},
          description: integration.description ?? integration.name ?? 'Custom integration',
          category: (integration as any).category ?? 'analytics',
          features: (integration as any).features ?? [],
          name: integration.name ?? integration.id,
        } as IntegrationDefinition)
      }
    }
  }

  return merged
}

const mergeState = (saved: Partial<IntegrationStateSnapshot> | null): IntegrationStateSnapshot => {
  if (!saved) {
    return cloneDefaultIntegrationState()
  }

  const state = cloneDefaultIntegrationState()

  return {
    integrations: mergeIntegrations(saved.integrations as Partial<IntegrationDefinition>[] | undefined),
    webhooks: saved.webhooks ?? state.webhooks,
    deliveries: saved.deliveries ?? state.deliveries,
  }
}

export const loadIntegrationState = (): IntegrationStateSnapshot => {
  if (typeof window === 'undefined') {
    return cloneDefaultIntegrationState()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return cloneDefaultIntegrationState()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<IntegrationStateSnapshot>
    return mergeState(parsed)
  } catch (error) {
    console.warn('Failed to parse integration state. Resetting to defaults.', error)
    return cloneDefaultIntegrationState()
  }
}

export const saveIntegrationState = (state: IntegrationStateSnapshot) => {
  if (typeof window === 'undefined') {
    return
  }

  const payload: IntegrationStateSnapshot = {
    integrations: state.integrations.map(integration => ({
      ...integration,
      config: integration.config ?? {},
    })),
    webhooks: state.webhooks.map(webhook => ({ ...webhook })),
    deliveries: state.deliveries.map(delivery => ({ ...delivery })),
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export const resetIntegrationState = (): IntegrationStateSnapshot => {
  if (typeof window === 'undefined') {
    return cloneDefaultIntegrationState()
  }

  window.localStorage.removeItem(STORAGE_KEY)
  return cloneDefaultIntegrationState()
}
