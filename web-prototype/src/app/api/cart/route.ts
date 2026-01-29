import { NextRequest } from 'next/server'
import { cartRepository } from '@/features/cart/repository'
import { AddToCartSchema } from '@/features/cart/types'
import { handleApiRequest, createApiResponse, createApiError } from '@/core/utils/api'

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get cart items
 *     description: Retrieve all items in the shopping cart
 *     tags:
 *       - Cart
 *     responses:
 *       200:
 *         description: Cart items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CartItem'
 */
export async function GET() {
  const result = await handleApiRequest(async () => {
    return cartRepository.getCartItems()
  })

  if (result.error) {
    return createApiError(result.error, 500)
  }

  return Response.json(createApiResponse(result.data, 'Cart items fetched'))
}

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Add item to cart
 *     description: Add a product to the shopping cart with specified quantity
 *     tags:
 *       - Cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to add
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Quantity of the product
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/CartItem'
 *       400:
 *         description: Invalid request data
 */
export async function POST(request: NextRequest) {
  const result = await handleApiRequest(async () => {
    const body = await request.json()
    const validation = AddToCartSchema.safeParse(body)

    if (!validation.success) {
      throw new Error('Invalid request data')
    }

    return cartRepository.addToCart(validation.data.productId, validation.data.quantity)
  })

  if (result.error) {
    return createApiError(result.error, result.error.includes('Unauthorized') ? 401 : 500)
  }

  return Response.json(createApiResponse(result.data, 'Item added to cart'))
}
