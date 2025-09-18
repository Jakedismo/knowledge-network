import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-bold tracking-tight">You're Offline</h1>

        <p className="mb-8 text-muted-foreground">
          It looks like you've lost your internet connection.
          Some features may be unavailable until you reconnect.
        </p>

        <div className="space-y-4">
          <Button
            onClick={handleRetry}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          <div className="text-sm text-muted-foreground">
            <p>While offline, you can still:</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• View previously cached documents</li>
              <li>• Access your recent searches</li>
              <li>• Continue editing drafts</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">
            Your work will be automatically synced when you reconnect to the internet.
          </p>
        </div>
      </div>
    </div>
  )
}