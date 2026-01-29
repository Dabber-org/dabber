import Link from 'next/link'
import type { CartSummary as CartSummaryType } from '../types'

interface CartSummaryProps {
  summary: CartSummaryType
  shipping?: number
  tax?: number
}

export function CartSummary({ summary, shipping = 0, tax = 0 }: CartSummaryProps) {
  const total = summary.subtotal + shipping + tax

  return (
    <div className="bg-card rounded-lg border p-6 space-y-4">
      <h2 className="text-xl font-semibold">Order Summary</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal ({summary.totalItems} items)</span>
          <span>${summary.subtotal.toFixed(2)}</span>
        </div>

        {shipping > 0 && (
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>${shipping.toFixed(2)}</span>
          </div>
        )}

        {shipping === 0 && summary.subtotal > 100 && (
          <div className="flex justify-between text-green-600">
            <span>Shipping</span>
            <span>FREE</span>
          </div>
        )}

        {tax > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
        )}

        <div className="border-t pt-2 flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {!summary.isEmpty && (
        <Link
          href="/checkout"
          className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-md transition-colors inline-block text-center"
        >
          Proceed to Checkout
        </Link>
      )}

      {summary.subtotal < 100 && summary.subtotal > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Add ${(100 - summary.subtotal).toFixed(2)} more for free shipping!
        </p>
      )}
    </div>
  )
}
