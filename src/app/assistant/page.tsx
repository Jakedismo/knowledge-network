import dynamic from 'next/dynamic'
import { ChatPanel } from '@/components/assistant/ChatPanel'
import { ResearchPanel } from '@/components/assistant/ResearchPanel'
import { TranscriptionUploader } from '@/components/assistant/TranscriptionUploader'
import { ContextHelp } from '@/components/assistant/ContextHelp'

export const dynamicParams = false

export default function AssistantDemoPage() {
  // Editor suggestions demo is exposed via Editor Demo; here we show core assistant tools
  const FactCheckBadge = dynamic(() => import('@/components/assistant/FactCheckBadge'), { ssr: false })
  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Knowledge Assistant (Demo)</h1>
        <p className="text-muted-foreground">Chat, research, transcription, and fact-check UI stubs with mock provider.</p>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Chat</h2>
          <ChatPanel />
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Research</h2>
          <ResearchPanel />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Meeting Transcription</h2>
          <TranscriptionUploader />
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Fact Check & Help</h2>
          {/* Example claim */}
          <FactCheckBadge claim="All documents always include an owner field" />
          <div className="mt-3">
            <ContextHelp route="/assistant" />
          </div>
        </div>
      </section>
    </main>
  )
}

