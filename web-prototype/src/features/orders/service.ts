import type { Order } from '@/core/types/common'
import type { CreateOrderRequest, OrderWithDetails, OrderedProduct } from './types'
import { env } from '@/core/config/env'
// Repository kept for future server-side use; API-first for pages

export class OrderService {
  private baseUrl = env.NEXT_PUBLIC_APP_URL || ''

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const res = await fetch(`${this.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    const payload = await res.json()
    return payload.data
  }

  async getOrderById(id: string): Promise<OrderWithDetails | null> {
    const res = await fetch(`${this.baseUrl}/api/orders/${id}`, { cache: 'no-store' })
    const payload = await res.json()
    const order: Order | null = payload?.data ?? null
    return order ? this.enhanceOrder(order) : null
  }

  async getAllOrders(): Promise<OrderWithDetails[]> {
    const res = await fetch(`${this.baseUrl}/api/orders`, { cache: 'no-store' })
    const payload = await res.json()
    const orders: Order[] = payload?.data ?? []
    return orders.map(this.enhanceOrder)
  }

  parseOrderProducts(productsJson: string): OrderedProduct[] {
    try {
      return JSON.parse(productsJson)
    } catch {
      return []
    }
  }

  private enhanceOrder(order: Order): OrderWithDetails {
    const products = this.parseOrderProducts(order.products)

    return {
      ...order,
      itemCount: products.reduce((sum, item) => sum + item.quantity, 0),
      statusLabel: this.getStatusLabel(order.status),
    }
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    }
    return labels[status] || status
  }
}

export const orderService = new OrderService()
