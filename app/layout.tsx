import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/providers'
import { PoweredByMarquee } from '@/components/brand-wordmark'
import './globals.css'


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'BigCat Global',
  description: 'AI-powered cross-border commerce between Nigeria and China',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen overflow-y-auto w-full overflow-x-hidden">
        <div className="min-h-screen w-full max-w-full overflow-x-hidden">
          <div className="border-b border-border bg-card px-4 py-2">
            <PoweredByMarquee />
          </div>
          {process.env.PAYMENT_MODE === 'test' && <div role="status" className="bg-amber-100 text-amber-950 text-center px-4 py-2 text-sm">Test pilot: no real money or shipments. / 测试试点：不涉及真实资金或发货。</div>}
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  )
}
