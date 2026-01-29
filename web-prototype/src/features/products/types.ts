import { z } from 'zod'
import { CategorySchema, type Product } from '@/core/types/common'

// Product filtering
export const ProductFiltersSchema = z.object({
  category: CategorySchema.optional(),
  search: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
})

export type ProductFilters = z.infer<typeof ProductFiltersSchema>

// Product with computed fields
export interface ProductWithDetails extends Product {
  inStock: boolean
  categoryLabel: string
}

// Product repository interface
export interface ProductRepository {
  getProducts(filters?: ProductFilters): Promise<Product[]>
  getProductById(id: string): Promise<Product | null>
  getProductsByCategory(category: string): Promise<Product[]>
}
