'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createAssistantProvider } from './provider'
import type { AssistantContext, AssistantProvider } from './types'

interface AssistantRuntimeValue {
  provider: AssistantProvider
  context: AssistantContext
  setContext: (context: AssistantContext) => void
  mergeContext: (context: Partial<AssistantContext>) => void
  clearContext: () => void
}

const AssistantRuntimeContext = createContext<AssistantRuntimeValue | null>(null)

export function AssistantRuntimeProvider({ children }: { children: React.ReactNode }) {
  const providerRef = useRef<AssistantProvider | null>(null)
  if (!providerRef.current) {
    providerRef.current = createAssistantProvider()
  }
  const [context, setContextState] = useState<AssistantContext>({})

  const setContext = useCallback((next: AssistantContext) => {
    setContextState(sanitizeContext(next))
  }, [])

  const mergeContext = useCallback((next: Partial<AssistantContext>) => {
    setContextState((prev) => sanitizeContext({ ...prev, ...next }))
  }, [])

  const clearContext = useCallback(() => setContextState({}), [])

  const value = useMemo<AssistantRuntimeValue>(() => ({
    provider: providerRef.current!,
    context,
    setContext,
    mergeContext,
    clearContext,
  }), [context, setContext, mergeContext, clearContext])

  return <AssistantRuntimeContext.Provider value={value}>{children}</AssistantRuntimeContext.Provider>
}

export function useAssistantRuntime(): AssistantRuntimeValue {
  const ctx = useContext(AssistantRuntimeContext)
  if (!ctx) throw new Error('useAssistantRuntime must be used within AssistantRuntimeProvider')
  return ctx
}

export function useAssistantContextValue(): [AssistantContext, (partial: Partial<AssistantContext>) => void] {
  const { context, mergeContext } = useAssistantRuntime()
  const update = useCallback(
    (partial: Partial<AssistantContext>) => {
      mergeContext(partial)
    },
    [mergeContext]
  )
  return [context, update]
}

function sanitizeContext(input: AssistantContext): AssistantContext {
  const output: AssistantContext = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      output[key as keyof AssistantContext] = value.filter((v) => v !== undefined && v !== null) as any
    } else {
      output[key as keyof AssistantContext] = value as any
    }
  }
  return output
}
