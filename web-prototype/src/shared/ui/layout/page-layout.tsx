import { ReactNode } from 'react'
import { Header } from './header'
import { Footer } from './footer'

interface PageLayoutProps {
  children: ReactNode
  cartItemCount?: number
  currentPage?: 'home' | 'cart' | 'checkout'
}

export function PageLayout({ children, cartItemCount, currentPage }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header cartItemCount={cartItemCount} currentPage={currentPage} />

      <main className="container mx-auto px-4 py-8 flex-1">{children}</main>

      <Footer />
    </div>
  )
}
