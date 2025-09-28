import './globals.css'
import { Inter } from 'next/font/google'
import { CartProvider } from '@/hooks/useCart'
import AppShell from '@/components/layout/AppShell'
import { getCurrentRole } from '@/lib/auth'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ERPv2 - Enterprise Resource Planning',
  description: 'Modern ERP system built with Next.js 14, TypeScript, and Prisma',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = getCurrentRole()
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <CartProvider>
            <AppShell role={role}>
              {children}
            </AppShell>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
