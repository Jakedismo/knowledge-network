'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { ChatPanel } from '@/components/assistant/ChatPanel'
import { ResearchPanel } from '@/components/assistant/ResearchPanel'
import { TranscriptionUploader } from '@/components/assistant/TranscriptionUploader'
import { ContextHelp } from '@/components/assistant/ContextHelp'
import { FactCheckBadge } from '@/components/assistant/FactCheckBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, MessageSquare, Search, Mic, ShieldCheck } from 'lucide-react'

export default function AssistantPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
          </div>
          <p className="text-muted-foreground">
            Leverage AI-powered tools for chat, research, transcription, and fact-checking
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat Section */}
          <Card className="border-2 hover:border-purple-200 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                <span>AI Chat Assistant</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChatPanel />
            </CardContent>
          </Card>

          {/* Research Section */}
          <Card className="border-2 hover:border-blue-200 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-blue-600" />
                <span>Research Assistant</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResearchPanel />
            </CardContent>
          </Card>

          {/* Transcription Section */}
          <Card className="border-2 hover:border-green-200 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5 text-green-600" />
                <span>Meeting Transcription</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TranscriptionUploader />
            </CardContent>
          </Card>

          {/* Fact Check Section */}
          <Card className="border-2 hover:border-orange-200 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-orange-600" />
                <span>Fact Check & Help</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Verify claims and get contextual help
                </p>
                <FactCheckBadge claim="All documents always include an owner field" />
              </div>
              <div className="pt-2 border-t">
                <ContextHelp route="/assistant" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Capabilities Info */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">AI Capabilities</h3>
                <div className="grid gap-2 md:grid-cols-2 text-sm text-muted-foreground">
                  <div>• Natural language understanding</div>
                  <div>• Contextual research assistance</div>
                  <div>• Real-time transcription & summarization</div>
                  <div>• Fact verification with sources</div>
                  <div>• Multi-modal content analysis</div>
                  <div>• Intelligent content suggestions</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}