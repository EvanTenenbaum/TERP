import './globals.css'
import { Inter } from 'next/font/google'
import { CartProvider } from '@/hooks/useCart'
import AppShell from '@/components/layout/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ERPv2 - Enterprise Resource Planning',
  description: 'Modern ERP system built with Next.js 14, TypeScript, and Prisma',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <AppShell>
            {children}
          </AppShell>
        </CartProvider>
      </body>
    </html>
  )
}
