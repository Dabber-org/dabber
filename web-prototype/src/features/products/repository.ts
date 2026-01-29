import { db } from '@/core/config/database'
import type { Product } from '@/core/types/common'
import type { ProductFilters, ProductRepository } from './types'

export class PrismaProductRepository implements ProductRepository {
  async getProducts(filters: ProductFilters = {}): Promise<Product[]> {
    const { category, search, minPrice, maxPrice } = filters

    return db.product.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
        ...(search && {
          OR: [{ name: { contains: search } }, { description: { contains: search } }],
        }),
        ...(minPrice && { price: { gte: minPrice } }),
        ...(maxPrice && { price: { lte: maxPrice } }),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getProductById(id: string): Promise<Product | null> {
    const product = await db.product.findUnique({
      where: { id, isActive: true },
    })
    console.log('product', product)
    return product ? product : null
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return this.getProducts({ category: category as 'mobile' | 'laptop' | 'pc' })
  }
}

export const productRepository = new PrismaProductRepository()
