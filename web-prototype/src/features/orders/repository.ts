import { db } from '@/core/config/database'
import { ApiError } from '@/core/utils/api'
import type { Order, OrderStatus } from '@/core/types/common'
import type { OrderRepository, CreateOrderRequest, OrderedProduct } from './types'

export class PrismaOrderRepository implements OrderRepository {
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const { cartItems, totalPrice } = request

    // Verify stock availability for all items
    const stockValidation = await Promise.all(
      cartItems.map(async (item: { productId: string; quantity: number }) => {
        const product = await db.product.findUnique({
          where: { id: item.productId, isActive: true },
        })

        if (!product) {
          throw new ApiError(`Product ${item.productId} not found`, 404)
        }

        if (product.stock < item.quantity) {
          throw new ApiError(`Insufficient stock for ${product.name}`, 400)
        }

        return { product, item }
      })
    )

    // Create order and update stock in transaction
    return db.$transaction(async (tx) => {
      // Create the order
      const orderedProducts: OrderedProduct[] = stockValidation.map(({ product, item }) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      }))

      const order = await tx.order.create({
        data: {
          products: JSON.stringify(orderedProducts),
          totalPrice,
          status: 'PENDING',
        },
      })

      // Update stock for each product
      await Promise.all(
        stockValidation.map(({ product, item }) =>
          tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: item.quantity } },
          })
        )
      )

      // Clear cart after checkout
      await tx.cartItem.deleteMany()

      return order
    })
  }

  async getOrderById(id: string): Promise<Order | null> {
    return db.order.findUnique({
      where: { id },
    })
  }

  async getAllOrders(): Promise<Order[]> {
    return db.order.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await db.order.findUnique({
      where: { id },
    })

    if (!order) {
      throw new ApiError('Order not found', 404)
    }

    return db.order.update({
      where: { id },
      data: { status },
    })
  }
}

export const orderRepository = new PrismaOrderRepository()
