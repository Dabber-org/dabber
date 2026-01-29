import { z } from 'zod'
import type { CartItem } from '@/core/types/common'

// Cart actions
export const AddToCartSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).default(1),
})

export type AddToCartRequest = z.infer<typeof AddToCartSchema>

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
})

export type UpdateCartItemRequest = z.infer<typeof UpdateCartItemSchema>

// Cart with computed totals
export interface CartSummary {
  items: CartItem[]
  totalItems: number
  subtotal: number
  isEmpty: boolean
}

// Cart repository interface
export interface CartRepository {
  getCartItems(): Promise<CartItem[]>
  getCartItemByProductId(productId: string): Promise<CartItem | null>
  addToCart(productId: string, quantity: number): Promise<CartItem>
  updateCartItem(id: string, quantity: number): Promise<CartItem>
  removeFromCart(id: string): Promise<void>
  clearCart(): Promise<void>
}
