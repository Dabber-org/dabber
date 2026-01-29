import type { CartItem } from '@/core/types/common'
import type { CartSummary, AddToCartRequest, UpdateCartItemRequest } from './types'
import { env } from '@/core/config/env'
// Repository kept for future server-side use; API-first for pages

export class CartService {
  async getCartSummary(): Promise<CartSummary> {
    const res = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/cart`, { cache: 'no-store' })
    const payload = await res.json()
    const items: CartItem[] = payload?.data?.items ?? payload?.data ?? []

    return {
      items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      isEmpty: items.length === 0,
    }
  }

  async addToCart(request: AddToCartRequest): Promise<CartItem> {
    const res = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload.error || 'Failed to add to cart')
    }
    return payload.data
  }

  async updateCartItem(id: string, request: UpdateCartItemRequest): Promise<CartItem> {
    const res = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/cart/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    const payload = await res.json()
    return payload.data
  }

  async removeFromCart(id: string): Promise<CartItem> {
    const res = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/cart/${id}`, { method: 'DELETE' })
    const payload = await res.json()
    return payload.data
  }

  async clearCart(): Promise<void> {
    // No endpoint yet; could add /api/cart/clear if desired
  }

  calculateShipping(subtotal: number): number {
    return subtotal > 100 ? 0 : 9.99
  }

  calculateTax(subtotal: number): number {
    return subtotal * 0.08
  }

  calculateTotal(subtotal: number): number {
    const shipping = this.calculateShipping(subtotal)
    const tax = this.calculateTax(subtotal)
    return subtotal + shipping + tax
  }
}

export const cartService = new CartService()
