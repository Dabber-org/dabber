import { NextRequest } from 'next/server'
import { cartRepository } from '@/features/cart/repository'
import { UpdateCartItemSchema } from '@/features/cart/types'
import { handleApiRequest, createApiResponse, createApiError } from '@/core/utils/api'
/**
 * @swagger
 * /api/cart/{id}:
 *   patch:
 *     description: Updates the cart item by id
 *     responses:
 *       200:
 *         description: Cart item updated
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await handleApiRequest(async () => {
    const body = await request.json()
    const validation = UpdateCartItemSchema.safeParse(body)

    if (!validation.success) {
      throw new Error('Invalid request data')
    }

    return cartRepository.updateCartItem(id, validation.data.quantity)
  })

  if (result.error) {
    return createApiError(result.error, result.error.includes('Unauthorized') ? 401 : 500)
  }

  return Response.json(createApiResponse(result.data, 'Cart item updated'))
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await handleApiRequest(async () => {
    await cartRepository.removeFromCart(id)
    return { success: true }
  })

  if (result.error) {
    return createApiError(result.error, result.error.includes('Unauthorized') ? 401 : 500)
  }

  return Response.json(createApiResponse(result.data, 'Item removed from cart'))
}
