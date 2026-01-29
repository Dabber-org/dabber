import { productRepository } from '@/features/products/repository'
import { handleApiRequest, createApiResponse, createApiError } from '@/core/utils/api'

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     description: Returns the product by id
 *     responses:
 *       200:
 *         description: Product!
 *       404:
 *         description: Product not found
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await handleApiRequest(async () => {
    return productRepository.getProductById(id)
  })

  if (result.error) {
    return createApiError(result.error)
  }

  if (!result.data) {
    return createApiError('Product not found', 404)
  }

  return Response.json(createApiResponse(result.data))
}
