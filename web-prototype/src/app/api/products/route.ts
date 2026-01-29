import { NextRequest } from 'next/server'
import { productRepository } from '@/features/products/repository'
import { ProductFiltersSchema } from '@/features/products/types'
import { handleApiRequest, createApiResponse, createApiError } from '@/core/utils/api'

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a list of products with optional filters
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [mobile, laptop, pc]
 *         description: Filter by product category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search products by name or description
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: List of products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid filters
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Parse and validate filters
  const filters = {
    category: searchParams.get('category') || undefined,
    search: searchParams.get('search') || undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
  }

  const validation = ProductFiltersSchema.safeParse(filters)
  console.log('validation', validation)
  if (!validation.success) {
    return createApiError('Invalid filters', 400)
  }

  const result = await handleApiRequest(async () => {
    return productRepository.getProducts(validation.data)
  })

  if (result.error) {
    return createApiError(result.error)
  }

  return Response.json(createApiResponse(result.data))
}
