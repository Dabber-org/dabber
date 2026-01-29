import { z } from 'zod'

// Database enums
export const CategorySchema = z.enum(['mobile', 'laptop', 'pc'])
export type Category = z.infer<typeof CategorySchema>

export const OrderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

// Base product schema
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: CategorySchema,
  price: z.number().positive(),
  imageUrl: z.string().url(),
  stock: z.number().int().min(0),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Product = z.infer<typeof ProductSchema>

// Cart item schema
export const CartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  quantity: z.number().int().min(1),
  product: ProductSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type CartItem = z.infer<typeof CartItemSchema>

// Order schema
export const OrderSchema = z.object({
  id: z.string(),
  products: z.string(),
  totalPrice: z.number().positive(),
  status: OrderStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Order = z.infer<typeof OrderSchema>

// API response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface FilterParams {
  category?: Category
  search?: string
  minPrice?: number
  maxPrice?: number
}
