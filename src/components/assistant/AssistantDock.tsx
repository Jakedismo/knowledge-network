"use client"

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Sparkles, MessageSquare, Search, ShieldCheck, Mic, Command, BookOpen } from 'lucide-react'
import { useAssistantRuntime } from '@/lib/assistant/runtime-context'
import { ChatPanel } from './ChatPanel'
import { AssistantResearchTool } from './tools/AssistantResearchTool'
import { AssistantVerifyTool } from './tools/AssistantVerifyTool'
import { AssistantCaptureTool } from './tools/AssistantCaptureTool'
import type { ContextHelpItem } from '@/lib/assistant/types'

const TAB_CONFIG = [
  { id: 'chat', label: 'Ask', description: 'Conversational agent for quick answers.', icon: MessageSquare },
  { id: 'research', label: 'Research', description: 'Generate concise research briefs.', icon: Search },
  { id: 'verify', label: 'Verify', description: 'Fact-check statements with cited evidence.', icon: ShieldCheck },
  { id: 'capture', label: 'Capture', description: 'Transcribe meetings into drafts.', icon: Mic },
  { id: 'guide', label: 'Guide', description: 'How to use + examples.', icon: BookOpen },
] as const

type TabId = (typeof TAB_CONFIG)[number]['id']

export function AssistantDock() {
  const { context, mergeContext, provider } = useAssistantRuntime()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [helpItems, setHelpItems] = useState<ContextHelpItem[]>([])
  const [loadingHelp, setLoadingHelp] = useState(false)

  // Listen for global toggle events emitted by the layout header
  useEffect(() => {
    const handler = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail?.open === 'boolean') {
        setOpen(event.detail.open)
      } else {
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('assistant:toggle', handler as EventListener)
    return () => window.removeEventListener('assistant:toggle', handler as EventListener)
  }, [])

  // Capture current text selection when the dock opens
  useEffect(() => {
    if (!open) return
    const selection = typeof window !== 'undefined' ? window.getSelection()?.toString()?.trim() : ''
    if (selection) {
      mergeContext({ selectionText: selection })
    }
  }, [open, mergeContext])

  // Keyboard shortcut: Cmd/Ctrl + I toggles the dock
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Load contextual help when the dock opens or the context changes
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoadingHelp(true)
      try {
        const payload: Parameters<typeof provider.contextHelp>[0] = {}
        if (context.route) payload.route = context.route
        if (context.selectionText) payload.selectionText = context.selectionText
        if (context.tags) payload.tags = context.tags
        const items = await provider.contextHelp(payload)
        if (!cancelled) setHelpItems(items)
      } catch (error) {
        if (!cancelled) setHelpItems([])
      } finally {
        if (!cancelled) setLoadingHelp(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, context.route, context.selectionText, context.tags, provider])

  const pageLabel = useMemo(() => context.pageTitle ?? 'Workspace', [context.pageTitle])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 shadow-lg"
      >
        <Sparkles className="h-4 w-4" />
        Ask Knowledge
        <span className="hidden items-center gap-1 rounded border border-white/30 px-1 text-[10px] font-medium text-white/90 md:flex">
          <Command className="h-3 w-3" /> I
        </span>
      </Button>

      <DialogContent className="h-[80vh] w-[95vw] max-w-5xl overflow-hidden border-none p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">Knowledge Assistant</DialogTitle>
        <div className="flex h-full flex-col bg-background">
          <header className="flex items-start justify-between gap-4 border-b px-6 py-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {pageLabel}
                </Badge>
                <span>{context.route}</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold">Knowledge Assistant</h2>
              <p className="text-sm text-muted-foreground">
                A single OpenAI Agent orchestrates chat, research, verification, and capture tools with full workspace
                context.
              </p>
            </div>
            <div className="hidden max-w-xs flex-1 flex-col gap-2 text-xs text-muted-foreground md:flex">
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Agent capabilities
              </div>
              <ul className="grid grid-cols-2 gap-1">
                <li>Summaries & insights</li>
                <li>Evidence-backed fact checks</li>
                <li>Research briefs</li>
                <li>Meeting transcriptions</li>
              </ul>
              <div className="flex items-center gap-2 pt-1">
                <span className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {process.env.NEXT_PUBLIC_DEV_USER_ID ? 'Dev Mode' : 'Production'}
                </span>
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-6 md:flex-row">
            <div className="flex h-full flex-1 flex-col">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)} className="flex h-full flex-col">
                <TabsList className="flex flex-wrap gap-2 bg-transparent p-0">
                  {TAB_CONFIG.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm data-[state=active]:border-primary"
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Separator className="my-4" />

                <div className="flex flex-1 flex-col overflow-hidden">
                  <TabsContent value="chat" className="flex h-full flex-1 flex-col overflow-hidden">
                    <div className="mb-3 text-sm text-muted-foreground">
                      Ask the assistant anything about your workspace, documents, or upcoming work.
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <ChatPanel />
                    </div>
                  </TabsContent>

                  <TabsContent value="research" className="flex h-full flex-1 flex-col overflow-hidden">
                    <AssistantResearchTool />
                  </TabsContent>

                  <TabsContent value="verify" className="flex h-full flex-1 flex-col overflow-hidden">
                    <AssistantVerifyTool />
                  </TabsContent>

                  <TabsContent value="capture" className="flex h-full flex-1 flex-col overflow-hidden">
                    <AssistantCaptureTool />
                  </TabsContent>

                  <TabsContent value="guide" className="flex h-full flex-1 flex-col overflow-hidden">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                          <BookOpen className="h-4 w-4" /> What you can do
                        </div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          <li>Search documents, collections, templates, and tags</li>
                          <li>Create, update, move, or delete documents (with confirmation)</li>
                          <li>Apply templates to create new drafts</li>
                          <li>Publish and share templates with your team</li>
                        </ul>
                      </div>
                      <div className="rounded-lg border bg-muted/10 p-4">
                        <div className="mb-2 text-sm font-semibold text-foreground">Clickable examples</div>
                        <div className="grid grid-cols-1 gap-2">
                          <ExampleButton
                            label="Find onboarding docs tagged policy"
                            onClick={() => {
                              setActiveTab('chat')
                              window.dispatchEvent(new CustomEvent('assistant:chat', { detail: { prompt: 'Search documents tagged policy about onboarding, show 5' } }))
                            }}
                          />
                          <ExampleButton
                            label="List recent documents"
                            onClick={() => {
                              setActiveTab('chat')
                              window.dispatchEvent(new CustomEvent('assistant:chat', { detail: { prompt: 'List recent documents' } }))
                            }}
                          />
                          <ExampleButton
                            label="Apply Meeting Notes template from my selection"
                            onClick={() => {
                              setActiveTab('chat')
                              const selection = typeof window !== 'undefined' ? window.getSelection()?.toString() || undefined : undefined
                              window.dispatchEvent(
                                new CustomEvent('assistant:chat', {
                                  detail: {
                                    prompt:
                                      'Use apply_template_from_context for template "meeting-notes-v1" with title "Weekly Sync Notes". Propose change and ask to proceed.',
                                    context: selection ? { selectionText: selection } : undefined,
                                  },
                                })
                              )
                            }}
                          />
                          <ExampleButton
                            label="Publish a template"
                            onClick={() => {
                              setActiveTab('chat')
                              window.dispatchEvent(
                                new CustomEvent('assistant:chat', {
                                  detail: {
                                    prompt:
                                      'Publish template tpl123 as PUBLIC titled "Incident Postmortem" with tags incident, rca. Summarize and ask to proceed.',
                                  },
                                })
                              )
                            }}
                          />
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">Examples open in Ask tab and run immediately.</p>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <aside className="hidden w-full max-w-xs flex-col gap-4 md:flex">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4" /> Contextual tips
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  The agent automatically pulls in route, document, and selection details. Recent selection text is
                  shared when available.
                </p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Route:</span> {context.route ?? '—'}
                  </div>
                  {context.selectionText ? (
                    <div>
                      <span className="font-medium text-foreground">Selection:</span> {context.selectionText}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 overflow-hidden rounded-lg border bg-muted/10">
                <div className="border-b px-4 py-3 text-sm font-semibold text-foreground">Suggested next steps</div>
                <div className="h-full overflow-auto px-4 py-3 text-sm text-muted-foreground">
                  {loadingHelp ? (
                    <p>Preparing guidance…</p>
                  ) : helpItems.length > 0 ? (
                    <ul className="space-y-3">
                      {helpItems.map((item) => (
                        <li key={item.id}>
                          <div className="font-medium text-foreground">{item.title}</div>
                          <p className="text-xs text-muted-foreground">{item.body}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No contextual suggestions yet. Ask the assistant for help.</p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AssistantDock

function ExampleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded border bg-background px-3 py-2 text-left text-sm hover:bg-muted/40"
    >
      {label}
    </button>
  )
}
