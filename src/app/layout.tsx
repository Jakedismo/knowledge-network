import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ApolloClientProvider } from '@/components/providers/ApolloClientProvider'
import { AssistantRuntimeProvider } from '@/lib/assistant/runtime-context'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'

export const metadata: Metadata = {
  title: {
    default: 'Knowledge Network',
    template: '%s | Knowledge Network',
  },
  description: 'AI-powered enterprise knowledge management platform with real-time collaboration and intelligent discovery.',
  keywords: ['knowledge management', 'AI', 'collaboration', 'enterprise', 'productivity', 'PWA', 'mobile'],
  authors: [{ name: 'Knowledge Network Team' }],
  creator: 'Knowledge Network',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://knowledge-network.app',
    title: 'Knowledge Network',
    description: 'AI-powered enterprise knowledge management platform',
    siteName: 'Knowledge Network',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Knowledge Network',
    description: 'AI-powered enterprise knowledge management platform',
    creator: '@knowledgenetwork',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#8B5CF6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KnowNet" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ApolloClientProvider>
          <AssistantRuntimeProvider>
            <div className="relative flex min-h-screen flex-col pb-16 md:pb-0">
              <div className="flex-1">
                {children}
              </div>
              <MobileBottomNav />
              <InstallPrompt variant="toast" autoShow={true} showDelay={30000} />
            </div>
          </AssistantRuntimeProvider>
        </ApolloClientProvider>
      </body>
    </html>
  )
}
