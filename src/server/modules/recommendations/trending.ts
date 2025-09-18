import type { ActivityEvent, TrendingTopic } from './types'
import { expHalfLifeDecay } from './decay'

export interface TrendingParams {
  events: ActivityEvent[]
  workspaceId: string
  nowMs?: number
  windowMinutes?: number // recent window
  baselineMinutes?: number // baseline window before the recent window
}

// Simple time-decayed trending score using recent vs. baseline windows
export function detectTrendingTopics({ events, workspaceId, nowMs, windowMinutes, baselineMinutes }: TrendingParams): TrendingTopic[] {
  const now = nowMs ?? Date.now()
  const winMs = (windowMinutes ?? 60) * 60 * 1000
  const baseMs = (baselineMinutes ?? 6 * 60) * 60 * 1000
  const startRecent = now - winMs
  const startBase = now - winMs - baseMs

  const recent = new Map<string, number>()
  const base = new Map<string, number>()

  for (const e of events) {
    if (e.workspaceId !== workspaceId) continue
    const ts = e.timestamp
    const tagIds = e.tagIds ?? []
    if (e.knowledgeId && tagIds.length === 0) {
      // count by knowledgeId as a topic proxy when tags absent
      tagIds.push(`doc:${e.knowledgeId}`)
    }
    for (const t of tagIds) {
      if (ts >= startRecent) {
        recent.set(t, (recent.get(t) ?? 0) + 1)
      } else if (ts >= startBase && ts < startRecent) {
        base.set(t, (base.get(t) ?? 0) + 1)
      }
    }
  }

  const topics = new Map<string, { volume: number; delta: number }>()
  const keys = new Set<string>([...recent.keys(), ...base.keys()])
  for (const k of keys) {
    const r = recent.get(k) ?? 0
    const b = base.get(k) ?? 0
    const delta = r - b / Math.max(1, (baselineMinutes ?? 360) / (windowMinutes ?? 60))
    topics.set(k, { volume: r, delta })
  }

  const scored: TrendingTopic[] = [...topics.entries()]
    .map(([k, v]) => ({ key: k, volume: v.volume, delta: v.delta, score: zScoreLike(v.delta, topics) }))
    .filter((t) => t.volume > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)

  return scored
}

function zScoreLike(value: number, all: Map<string, { volume: number; delta: number }>): number {
  const deltas = [...all.values()].map((x) => x.delta)
  const mean = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length)
  const variance = deltas.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, deltas.length)
  const std = Math.sqrt(variance)
  return std === 0 ? (value > 0 ? 1 : 0) : (value - mean) / std
}

// Utility: time-decayed count by key (e.g., knowledgeId) for spotlight widgets
export function decayedCountsByKey(events: ActivityEvent[], keyOf: (e: ActivityEvent) => string | undefined, nowMs: number, halfLifeHours: number): Map<string, number> {
  const m = new Map<string, number>()
  for (const e of events) {
    const k = keyOf(e)
    if (!k) continue
    const w = (e.weight ?? 1) * expHalfLifeDecay(nowMs - e.timestamp, halfLifeHours)
    m.set(k, (m.get(k) ?? 0) + w)
  }
  return m
}

