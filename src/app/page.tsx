import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Knowledge Network Dashboard - Centralized hub for all your knowledge management needs',
}

export default function HomePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to Knowledge Network
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-powered enterprise knowledge management platform with real-time collaboration
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Knowledge Capture"
            description="Rich text editor with real-time collaboration and AI-powered content suggestions"
            icon="📝"
          />
          <FeatureCard
            title="Smart Organization"
            description="Hierarchical structure with intelligent tagging and automatic categorization"
            icon="📁"
          />
          <FeatureCard
            title="AI-Powered Search"
            description="Advanced search with semantic understanding and contextual recommendations"
            icon="🔍"
          />
          <FeatureCard
            title="Real-time Collaboration"
            description="Simultaneous editing with presence indicators and conflict resolution"
            icon="👥"
          />
          <FeatureCard
            title="Analytics & Insights"
            description="Usage analytics and knowledge gap identification for better decision making"
            icon="📊"
          />
          <FeatureCard
            title="Mobile & Offline"
            description="Progressive Web App with offline support and seamless synchronization"
            icon="📱"
          />
        </div>

        {/* Status */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">System Status</h2>
          <div className="space-y-2">
            <StatusItem label="Next.js 15+ Infrastructure" status="Ready" />
            <StatusItem label="TypeScript Configuration" status="Ready" />
            <StatusItem label="Tailwind CSS Design System" status="Ready" />
            <StatusItem label="Modern React Patterns" status="Ready" />
            <StatusItem label="Bun Development Environment" status="Pending" />
            <StatusItem label="API Architecture" status="In Progress" />
            <StatusItem label="Database Schema" status="Pending" />
            <StatusItem label="CI/CD Pipeline" status="Pending" />
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  title,
  description,
  icon
}: {
  title: string
  description: string
  icon: string
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="space-y-3">
        <div className="text-3xl">{icon}</div>
        <div className="space-y-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  )
}

function StatusItem({
  label,
  status
}: {
  label: string
  status: 'Ready' | 'In Progress' | 'Pending'
}) {
  const statusColors = {
    'Ready': 'text-green-600 bg-green-50 border-green-200',
    'In Progress': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'Pending': 'text-gray-600 bg-gray-50 border-gray-200'
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[status]}`}>
        {status}
      </span>
    </div>
  )
}