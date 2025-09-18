import { Metadata } from 'next'
import { IntegrationMarketplace } from '@/components/integrations/IntegrationMarketplace'

export const metadata: Metadata = {
  title: 'Integrations - Knowledge Network',
  description: 'Connect your favorite tools and services to extend functionality',
}

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <IntegrationMarketplace />
    </div>
  )
}