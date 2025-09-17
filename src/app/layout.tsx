import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ApolloClientProvider } from '@/components/providers/ApolloClientProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Knowledge Network',
    template: '%s | Knowledge Network',
  },
  description: 'AI-powered enterprise knowledge management platform with real-time collaboration and intelligent discovery.',
  keywords: ['knowledge management', 'AI', 'collaboration', 'enterprise', 'productivity'],
  authors: [{ name: 'Knowledge Network Team' }],
  creator: 'Knowledge Network',
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ApolloClientProvider>
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">
              {children}
            </div>
          </div>
        </ApolloClientProvider>
      </body>
    </html>
  )
}
