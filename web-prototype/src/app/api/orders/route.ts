import { NextRequest } from 'next/server'
import { orderRepository } from '@/features/orders/repository'
import { CreateOrderSchema } from '@/features/orders/types'
import { handleApiRequest, createApiResponse, createApiError } from '@/core/utils/api'
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     description: Create a new order with cart items and customer information
 *     tags:
 *       - Orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cartItems
 *               - totalPrice
 *               - customerInfo
 *             properties:
 *               cartItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                 minItems: 1
 *                 description: List of cart items
 *               totalPrice:
 *                 type: number
 *                 minimum: 0
 *                 description: Total price of the order
 *               customerInfo:
 *                 type: object
 *                 required:
 *                   - email
 *                   - firstName
 *                   - lastName
 *                   - address
 *                   - city
 *                   - state
 *                   - zipCode
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *     responses:
 *       200:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid request data
 */
export async function POST(request: NextRequest) {
  const result = await handleApiRequest(async () => {
    const body = await request.json()
    const validation = CreateOrderSchema.safeParse(body)

    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error.issues.map((i) => i.message).join(', ')}`)
    }

    return orderRepository.createOrder(validation.data)
  })

  if (result.error) {
    return createApiError(result.error, result.error.includes('Unauthorized') ? 401 : 500)
  }

  return Response.json(createApiResponse(result.data, 'Order created successfully'))
}

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders
 *     description: Retrieve a list of all orders
 *     tags:
 *       - Orders
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 */
export async function GET() {
  const result = await handleApiRequest(async () => {
    return orderRepository.getAllOrders()
  })

  if (result.error) {
    return createApiError(result.error, result.error.includes('Unauthorized') ? 401 : 500)
  }

  return Response.json(createApiResponse(result.data))
}
