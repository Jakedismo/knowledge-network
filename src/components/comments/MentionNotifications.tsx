"use client"
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { commentApi } from '@/lib/comments/api'
import type { CommentModel } from '@/types/comments'
import { getAuthenticatedUser } from '@/lib/graphql/client'

type Props = { knowledgeId: string }

export function MentionNotifications({ knowledgeId }: Props) {
  const [threads, setThreads] = useState<CommentModel[]>([])
  const me = getAuthenticatedUser()
  const userId = me?.sub ?? me?.id ?? ''
  const reload = async () => {
    const data = await commentApi.list(knowledgeId)
    setThreads(data)
  }
  useEffect(() => {
    reload()
  }, [knowledgeId])
  const myMentions = useMemo(() => {
    const all: { id: string; content: string }[] = []
    const push = (c: CommentModel) => {
      if (c.mentions?.some((m) => m.userId === userId)) all.push({ id: c.id, content: c.content })
      c.replies?.forEach(push)
    }
    threads.forEach(push)
    return all
  }, [threads, userId])
  const count = myMentions.length
  return (
    <div className="relative inline-block">
      <button type="button" className="relative rounded px-2 py-1 text-sm ring-1 ring-border hover:bg-accent" title="Mentions">
        @
        {count > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
            {count}
          </span>
        )}
      </button>
    </div>
  )
}

