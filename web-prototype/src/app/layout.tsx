import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cn } from '@/core/utils/cn'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ElectroStore - Electronics E-commerce',
  description: 'Your trusted destination for the latest electronics and technology.',
  keywords: 'electronics, mobile phones, laptops, desktop computers, e-commerce',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, 'antialiased')}>{children}</body>
    </html>
  )
}
