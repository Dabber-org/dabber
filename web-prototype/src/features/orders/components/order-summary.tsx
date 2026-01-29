import Image from 'next/image'
import type { CartItem } from '@/core/types/common'

interface OrderSummaryProps {
  cartItems: CartItem[]
  totalPrice: number
  shipping: number
  tax: number
  finalTotal: number
}

export function OrderSummary({
  cartItems,
  totalPrice,
  shipping,
  tax,
  finalTotal,
}: OrderSummaryProps) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <h2 className="text-2xl font-semibold mb-4">Order Summary</h2>

      <div className="space-y-4 mb-6">
        {cartItems.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
              <Image
                src={item.product.imageUrl}
                alt={item.product.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-tight">
                {item.product.name}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Qty: {item.quantity} × ${item.product.price}
              </p>
            </div>

            <div className="text-sm font-medium">
              ${(item.product.price * item.quantity).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${totalPrice.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>Shipping</span>
          <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
        </div>

        <div className="flex justify-between">
          <span>Tax</span>
          <span>${tax.toFixed(2)}</span>
        </div>

        <div className="border-t pt-2 flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>${finalTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
