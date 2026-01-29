import { orderRepository } from '@/features/orders/repository'
import { handleApiRequest, createApiResponse, createApiError } from '@/core/utils/api'
/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     description: Returns the order by id
 *     responses:
 *       200:
 *         description: Order!
 *       404:
 *         description: Order not found
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await handleApiRequest(async () => {
    return orderRepository.getOrderById(id)
  })

  if (result.error) {
    return createApiError(result.error, result.error.includes('Unauthorized') ? 401 : 500)
  }

  if (!result.data) {
    return createApiError('Order not found', 404)
  }

  return Response.json(createApiResponse(result.data))
}
