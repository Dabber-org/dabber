import { z } from 'zod'
import type { Order, OrderStatus } from '@/core/types/common'

// Customer information
export const CustomerInfoSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 characters'),
})

export type CustomerInfo = z.infer<typeof CustomerInfoSchema>

// Order creation request
export const CreateOrderSchema = z.object({
  cartItems: z.array(z.any()).min(1, 'Cart cannot be empty'),
  totalPrice: z.number().positive('Total price must be positive'),
  customerInfo: CustomerInfoSchema,
})

export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>

// Order with customer details
export interface OrderWithDetails extends Order {
  itemCount: number
  statusLabel: string
}

// Ordered product item
export interface OrderedProduct {
  id: string
  name: string
  price: number
  quantity: number
}

// Order repository interface
export interface OrderRepository {
  createOrder(request: CreateOrderRequest): Promise<Order>
  getOrderById(id: string): Promise<Order | null>
  getAllOrders(): Promise<Order[]>
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>
}
