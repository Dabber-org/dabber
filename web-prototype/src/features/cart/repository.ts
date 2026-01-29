import { db } from '@/core/config/database'
import { ApiError } from '@/core/utils/api'
import type { CartItem } from '@/core/types/common'
import type { CartRepository } from './types'

export class PrismaCartRepository implements CartRepository {
  async getCartItems(): Promise<CartItem[]> {
    return db.cartItem.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getCartItemByProductId(productId: string): Promise<CartItem | null> {
    return db.cartItem.findFirst({
      where: { productId },
      include: { product: true },
    })
  }

  async addToCart(productId: string, quantity: number): Promise<CartItem> {
    // Check if product exists and has sufficient stock
    const product = await db.product.findUnique({ where: { id: productId } })

    if (!product) {
      throw new ApiError('Product not found', 404)
    }

    if (!product.isActive) {
      throw new ApiError('Product is not available', 400)
    }

    if (product.stock < quantity) {
      throw new ApiError('Insufficient stock', 400)
    }

    // Check for existing cart item
    const existingItem = await this.getCartItemByProductId(productId)

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      if (product.stock < newQuantity) {
        throw new ApiError('Insufficient stock', 400)
      }
      return this.updateCartItem(existingItem.id, newQuantity)
    }

    return db.cartItem.create({
      data: { productId, quantity },
      include: { product: true },
    })
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem> {
    const cartItem = await db.cartItem.findUnique({
      where: { id },
      include: { product: true },
    })

    if (!cartItem) {
      throw new ApiError('Cart item not found', 404)
    }

    if (cartItem.product.stock < quantity) {
      throw new ApiError('Insufficient stock', 400)
    }

    return db.cartItem.update({
      where: { id },
      data: { quantity },
      include: { product: true },
    })
  }

  async removeFromCart(id: string): Promise<void> {
    const cartItem = await db.cartItem.findUnique({
      where: { id },
    })

    if (!cartItem) {
      throw new ApiError('Cart item not found', 404)
    }

    await db.cartItem.delete({ where: { id } })
  }

  async clearCart(): Promise<void> {
    await db.cartItem.deleteMany()
  }
}

export const cartRepository = new PrismaCartRepository()
