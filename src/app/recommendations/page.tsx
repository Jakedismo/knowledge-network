import { Metadata } from 'next'
import { RecommendationsWidget } from '@/components/recommendations/RecommendationsWidget'

export const metadata: Metadata = {
  title: 'Recommendations Overview',
  description: 'Smart discovery snapshots for the Knowledge Network',
}

export default function RecommendationsPage() {
  return (
    <div className="p-6">
      <RecommendationsWidget />
    </div>
  )
}
