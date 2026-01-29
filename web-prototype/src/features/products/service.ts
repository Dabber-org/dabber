import type { Product } from '@/core/types/common'
import type { ProductFilters, ProductWithDetails } from './types'
import { env } from '@/core/config/env'

// Pure helpers (module-level) — no `this` dependency
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    mobile: 'Mobile Phones',
    laptop: 'Laptops',
    pc: 'Desktop Computers',
  }
  return labels[category] || category
}

function enhanceProduct(product: Product): ProductWithDetails {
  return {
    ...product,
    inStock: product.stock > 0,
    categoryLabel: getCategoryLabel(product.category),
  }
}

export class ProductService {
  async getProducts(filters?: ProductFilters): Promise<ProductWithDetails[]> {
    const search = new URLSearchParams()
    if (filters?.category) search.set('category', String(filters.category))
    if (filters?.search) search.set('search', filters.search)
    if (filters?.minPrice) search.set('minPrice', String(filters.minPrice))
    if (filters?.maxPrice) search.set('maxPrice', String(filters.maxPrice))
    const res = await fetch(
      `${env.NEXT_PUBLIC_APP_URL}/api/products${search.toString().length > 0 ? `?${search}` : ''}`,
      {
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      console.error('Failed to fetch products:', res.status, res.statusText)
      return []
    }

    const payload = await res.json()
    const products: Product[] = payload?.data ?? []
    return products.map(enhanceProduct)
  }
  async getProductById(id: string): Promise<ProductWithDetails | null> {
    const res = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/products/${id}`, { cache: 'no-store' })

    if (!res.ok) {
      console.error('Failed to fetch product:', res.status, res.statusText)
      return null
    }

    const payload = await res.json()
    const product: Product | null = payload?.data ?? null
    return product ? enhanceProduct(product) : null
  }
  async getProductsByCategory(category: string): Promise<ProductWithDetails[]> {
    return this.getProducts({ category: category as 'mobile' | 'laptop' | 'pc' })
  }
}

export const productService = new ProductService()
