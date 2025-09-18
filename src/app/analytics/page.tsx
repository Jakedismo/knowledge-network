'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})

export default function AnalyticsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <AnalyticsDashboard />
      </AppLayout>
    </QueryClientProvider>
  )
}