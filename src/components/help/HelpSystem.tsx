'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, HelpCircle, Search, Book, Video, MessageCircle, ChevronRight, ChevronLeft, Sparkles, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface HelpTopic {
  id: string
  title: string
  description: string
  content: string
  category: 'getting-started' | 'features' | 'troubleshooting' | 'api' | 'admin'
  tags: string[]
  relatedTopics?: string[]
  videoUrl?: string
}

interface TourStep {
  target: string
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  action?: () => void
}

const helpTopics: HelpTopic[] = [
  {
    id: 'create-document',
    title: 'Creating Your First Document',
    description: 'Learn how to create and format documents',
    content: `
      <h3>Creating a New Document</h3>
      <ol>
        <li>Click the <strong>+ New</strong> button or press <code>Ctrl/Cmd + N</code></li>
        <li>Choose a template or start with a blank document</li>
        <li>Give your document a title</li>
        <li>Start typing in the editor</li>
      </ol>

      <h4>Formatting Options</h4>
      <ul>
        <li><strong>Bold</strong>: Ctrl/Cmd + B</li>
        <li><em>Italic</em>: Ctrl/Cmd + I</li>
        <li>Headings: Type # followed by space</li>
        <li>Lists: Type - or 1. followed by space</li>
      </ul>
    `,
    category: 'getting-started',
    tags: ['document', 'create', 'editor', 'formatting'],
    relatedTopics: ['editor-features', 'keyboard-shortcuts'],
    videoUrl: '/tutorials/create-document'
  },
  {
    id: 'collaboration',
    title: 'Real-time Collaboration',
    description: 'Work together with your team in real-time',
    content: `
      <h3>Collaborating with Others</h3>
      <p>Knowledge Network supports real-time collaboration, allowing multiple users to work on the same document simultaneously.</p>

      <h4>Key Features</h4>
      <ul>
        <li><strong>Live Cursors</strong>: See where others are typing</li>
        <li><strong>Presence Indicators</strong>: Know who's viewing the document</li>
        <li><strong>Comments</strong>: Add inline comments and discussions</li>
        <li><strong>Version History</strong>: Track all changes</li>
      </ul>

      <h4>Sharing Documents</h4>
      <ol>
        <li>Click the Share button in the toolbar</li>
        <li>Enter email addresses or select team members</li>
        <li>Set permissions (View, Comment, Edit)</li>
        <li>Send invitations</li>
      </ol>
    `,
    category: 'features',
    tags: ['collaboration', 'sharing', 'team', 'real-time'],
    relatedTopics: ['permissions', 'comments', 'version-history']
  },
  {
    id: 'search-tips',
    title: 'Advanced Search Techniques',
    description: 'Master the search functionality',
    content: `
      <h3>Search Like a Pro</h3>

      <h4>Basic Search</h4>
      <p>Type keywords in the search bar and press Enter.</p>

      <h4>Advanced Operators</h4>
      <ul>
        <li><code>"exact phrase"</code> - Search for exact phrase</li>
        <li><code>title:keyword</code> - Search in titles only</li>
        <li><code>author:name</code> - Find by author</li>
        <li><code>tag:important</code> - Filter by tag</li>
        <li><code>created:>2025-01-01</code> - Date filters</li>
      </ul>

      <h4>Search Shortcuts</h4>
      <ul>
        <li><strong>Ctrl/Cmd + K</strong>: Quick search</li>
        <li><strong>Ctrl/Cmd + F</strong>: Find in page</li>
      </ul>
    `,
    category: 'features',
    tags: ['search', 'find', 'filter', 'query'],
    relatedTopics: ['keyboard-shortcuts', 'filters']
  }
]

const tourSteps: TourStep[] = [
  {
    target: '.sidebar',
    title: 'Navigation Sidebar',
    content: 'Access your workspaces, collections, and recent documents here.',
    placement: 'right'
  },
  {
    target: '.search-bar',
    title: 'Global Search',
    content: 'Search across all your content with powerful filters and operators.',
    placement: 'bottom'
  },
  {
    target: '.create-button',
    title: 'Create New Content',
    content: 'Click here to create documents, collections, or upload files.',
    placement: 'bottom'
  },
  {
    target: '.editor',
    title: 'Rich Text Editor',
    content: 'Write and format your content with our powerful editor.',
    placement: 'top'
  }
]

export function HelpSystem() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showTour, setShowTour] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiQuery, setAIQuery] = useState('')
  const [aiResponse, setAIResponse] = useState('')
  const [isAILoading, setIsAILoading] = useState(false)

  // Filter topics based on search and category
  const filteredTopics = helpTopics.filter(topic => {
    const matchesSearch = searchQuery === '' ||
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = activeCategory === 'all' || topic.category === activeCategory

    return matchesSearch && matchesCategory
  })

  // Keyboard shortcut for help
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '?') {
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Start interactive tour
  const startTour = useCallback(() => {
    setIsOpen(false)
    setShowTour(true)
    setTourStep(0)
    highlightElement(tourSteps[0].target)
  }, [])

  // Highlight element for tour
  const highlightElement = (selector: string) => {
    const element = document.querySelector(selector)
    if (element) {
      element.classList.add('help-tour-highlight')
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // Clean up tour highlights
  const cleanupTour = () => {
    document.querySelectorAll('.help-tour-highlight').forEach(el => {
      el.classList.remove('help-tour-highlight')
    })
  }

  // Navigate tour
  const nextTourStep = () => {
    if (tourStep < tourSteps.length - 1) {
      cleanupTour()
      setTourStep(tourStep + 1)
      highlightElement(tourSteps[tourStep + 1].target)
    } else {
      endTour()
    }
  }

  const prevTourStep = () => {
    if (tourStep > 0) {
      cleanupTour()
      setTourStep(tourStep - 1)
      highlightElement(tourSteps[tourStep - 1].target)
    }
  }

  const endTour = () => {
    cleanupTour()
    setShowTour(false)
    setTourStep(0)
  }

  // AI Assistant handler
  const handleAIQuery = async () => {
    if (!aiQuery.trim()) return

    setIsAILoading(true)

    // Simulate AI response (in production, this would call an AI API)
    setTimeout(() => {
      const responses: Record<string, string> = {
        'how to share': 'To share a document, click the Share button in the toolbar, enter email addresses, set permissions, and send invitations.',
        'keyboard shortcuts': 'Popular shortcuts: Ctrl/Cmd+N (New), Ctrl/Cmd+S (Save), Ctrl/Cmd+K (Search), Ctrl/Cmd+B (Bold), Ctrl/Cmd+I (Italic)',
        'default': "I'll help you with that. Could you please be more specific about what you need help with?"
      }

      const response = Object.keys(responses).find(key =>
        aiQuery.toLowerCase().includes(key)
      ) || 'default'

      setAIResponse(responses[response as keyof typeof responses])
      setIsAILoading(false)
    }, 1000)
  }

  return (
    <>
      {/* Help Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full shadow-lg z-40"
        size="icon"
        variant="default"
      >
        <HelpCircle className="h-5 w-5" />
        <span className="sr-only">Help</span>
      </Button>

      {/* Help Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-64 border-r bg-gray-50 dark:bg-gray-900 p-4">
              <DialogHeader className="mb-4">
                <DialogTitle>Help Center</DialogTitle>
                <DialogDescription>
                  Get help and learn about features
                </DialogDescription>
              </DialogHeader>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search help..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Categories */}
              <div className="space-y-1 mb-4">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm",
                    activeCategory === 'all' ?
                      "bg-primary text-primary-foreground" :
                      "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  All Topics
                </button>
                <button
                  onClick={() => setActiveCategory('getting-started')}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm",
                    activeCategory === 'getting-started' ?
                      "bg-primary text-primary-foreground" :
                      "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  Getting Started
                </button>
                <button
                  onClick={() => setActiveCategory('features')}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm",
                    activeCategory === 'features' ?
                      "bg-primary text-primary-foreground" :
                      "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  Features
                </button>
                <button
                  onClick={() => setActiveCategory('troubleshooting')}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm",
                    activeCategory === 'troubleshooting' ?
                      "bg-primary text-primary-foreground" :
                      "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  Troubleshooting
                </button>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={startTour}
                >
                  <Book className="mr-2 h-4 w-4" />
                  Interactive Tour
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowAIAssistant(true)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Assistant
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('/tutorials', '_blank')}
                >
                  <Video className="mr-2 h-4 w-4" />
                  Video Tutorials
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open('/support', '_blank')}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6">
              <ScrollArea className="h-full">
                {showAIAssistant ? (
                  // AI Assistant View
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold">AI Help Assistant</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAIAssistant(false)}
                      >
                        Back to Topics
                      </Button>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <p className="text-sm">
                        Ask me anything about Knowledge Network! I can help with features,
                        troubleshooting, best practices, and more.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your question..."
                          value={aiQuery}
                          onChange={(e) => setAIQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleAIQuery}
                          disabled={isAILoading}
                        >
                          {isAILoading ? 'Thinking...' : 'Ask'}
                        </Button>
                      </div>

                      {aiResponse && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                          <p className="text-sm">{aiResponse}</p>
                        </div>
                      )}

                      {/* Suggested Questions */}
                      <div className="mt-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Suggested questions:
                        </p>
                        <div className="space-y-2">
                          {[
                            'How do I share a document?',
                            'What are the keyboard shortcuts?',
                            'How do I collaborate with my team?',
                            'How can I organize my content?'
                          ].map(question => (
                            <button
                              key={question}
                              onClick={() => {
                                setAIQuery(question)
                                handleAIQuery()
                              }}
                              className="text-left text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              → {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedTopic ? (
                  // Topic Detail View
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTopic(null)}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back
                      </Button>
                      {selectedTopic.videoUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedTopic.videoUrl, '_blank')}
                        >
                          <Video className="mr-1 h-4 w-4" />
                          Watch Video
                        </Button>
                      )}
                    </div>

                    <h2 className="text-2xl font-bold mb-2">{selectedTopic.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {selectedTopic.description}
                    </p>

                    <div
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedTopic.content }}
                    />

                    {selectedTopic.relatedTopics && (
                      <div className="mt-8 pt-8 border-t">
                        <h3 className="font-semibold mb-4">Related Topics</h3>
                        <div className="space-y-2">
                          {selectedTopic.relatedTopics.map(topicId => {
                            const topic = helpTopics.find(t => t.id === topicId)
                            if (!topic) return null
                            return (
                              <button
                                key={topicId}
                                onClick={() => setSelectedTopic(topic)}
                                className="text-left text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                → {topic.title}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Topics List View
                  <div>
                    <h2 className="text-2xl font-bold mb-4">
                      {activeCategory === 'all' ? 'All Help Topics' :
                       activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1).replace('-', ' ')}
                    </h2>

                    {filteredTopics.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No topics found matching your search.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredTopics.map(topic => (
                          <button
                            key={topic.id}
                            onClick={() => setSelectedTopic(topic)}
                            className="w-full text-left p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold mb-1">{topic.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {topic.description}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  {topic.tags.slice(0, 3).map(tag => (
                                    <span
                                      key={tag}
                                      className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive Tour Overlay */}
      {showTour && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={endTour} />
          <div
            className={cn(
              "absolute bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl pointer-events-auto max-w-sm",
              tourStep === 0 && "top-20 left-20",
              tourStep === 1 && "top-20 left-1/2 -translate-x-1/2",
              tourStep === 2 && "top-20 right-20",
              tourStep === 3 && "bottom-20 left-1/2 -translate-x-1/2"
            )}
          >
            <h3 className="font-semibold mb-2">{tourSteps[tourStep].title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {tourSteps[tourStep].content}
            </p>
            <div className="flex justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={prevTourStep}
                disabled={tourStep === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                {tourStep + 1} / {tourSteps.length}
              </span>
              <Button
                size="sm"
                onClick={tourStep === tourSteps.length - 1 ? endTour : nextTourStep}
              >
                {tourStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tour Highlight Styles */}
      <style jsx global>{`
        .help-tour-highlight {
          position: relative;
          z-index: 51;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.8);
          }
          100% {
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
          }
        }
      `}</style>
    </>
  )
}