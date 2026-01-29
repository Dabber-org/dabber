'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cartService } from '@/features/cart/service'
import { CartList } from '@/features/cart/components/cart-list'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { PageLayout } from '@/shared/ui/layout/page-layout'
import { BackLink } from '@/shared/ui/components/back-link'
import { LoadingSpinner } from '@/shared/ui/components/loading-spinner'
import type { CartSummary as CartSummaryType } from '@/features/cart/types'

export default function CartPage() {
  const [cartSummary, setCartSummary] = useState<CartSummaryType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCartSummary = async () => {
    try {
      const summary = await cartService.getCartSummary()
      setCartSummary(summary)
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCartSummary()
  }, [])

  if (isLoading) {
    return (
      <PageLayout currentPage="cart">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </PageLayout>
    )
  }

  if (!cartSummary) {
    return (
      <PageLayout currentPage="cart">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load cart</p>
        </div>
      </PageLayout>
    )
  }

  const shipping = cartService.calculateShipping(cartSummary.subtotal)
  const tax = cartService.calculateTax(cartSummary.subtotal)

  return (
    <PageLayout cartItemCount={cartSummary.totalItems} currentPage="cart">
      <BackLink href="/">Continue Shopping</BackLink>

      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {cartSummary.isEmpty ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Link href="/" className="inline-flex items-center gap-2 text-black hover:text-gray-800 font-medium">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CartList items={cartSummary.items} onRefresh={fetchCartSummary} />
          </div>

          <div className="lg:col-span-1">
            <CartSummary summary={cartSummary} shipping={shipping} tax={tax} />
          </div>
        </div>
      )}
    </PageLayout>
  )
}
