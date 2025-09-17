export type UserPresence = {
  userId: string
  displayName?: string
  color?: string
  avatarUrl?: string
  // ephemeral UI state
  typing?: boolean
}

export type SelectionPresence = {
  blockId: string
  range?: { start: number; end: number }
  color?: string
  displayName?: string
}

export type AwarenessState = {
  presence?: UserPresence
  selection?: SelectionPresence | null
}

