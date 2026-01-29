'use client'

import Link from 'next/link'
import { ShoppingCart, HelpCircle } from 'lucide-react'
import dynamic from 'next/dynamic'

const UserMenu = dynamic(
  () => import('@/features/auth/components/user-menu').then((mod) => ({ default: mod.UserMenu })),
  {
    ssr: false,
    loading: () => <div className="w-20 h-9" />,
  }
)

interface HeaderProps {
  cartItemCount?: number
  currentPage?: 'home' | 'cart' | 'checkout'
}

export function Header({ cartItemCount = 0, currentPage = 'home' }: HeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-3xl font-bold text-primary-700">
            ElectroStore
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/faq"
              className="flex items-center gap-2 text-sm font-medium hover:text-primary-600 transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              FAQ
            </Link>
            {currentPage !== 'cart' && (
              <Link
                href="/cart"
                className="flex items-center gap-2 text-sm font-medium hover:text-primary-600 transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                Cart {cartItemCount > 0 && `(${cartItemCount})`}
              </Link>
            )}

            {currentPage === 'cart' && (
              <span className="text-sm font-medium text-primary-600">Cart ({cartItemCount})</span>
            )}

            <UserMenu />
          </nav>
        </div>
      </div>
    </header>
  )
}
