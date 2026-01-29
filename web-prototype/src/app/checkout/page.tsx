import { redirect } from 'next/navigation'
import { cartService } from '@/features/cart/service'
import { CheckoutForm } from '@/features/orders/components/checkout-form'
import { OrderSummary } from '@/features/orders/components/order-summary'
import { PageLayout } from '@/shared/ui/layout/page-layout'
import { BackLink } from '@/shared/ui/components/back-link'

export default async function CheckoutPage() {
  const cartSummary = await cartService.getCartSummary()

  // Redirect to cart if empty
  if (cartSummary.isEmpty) {
    redirect('/cart')
  }

  const shipping = cartService.calculateShipping(cartSummary.subtotal)
  const tax = cartService.calculateTax(cartSummary.subtotal)
  const finalTotal = cartService.calculateTotal(cartSummary.subtotal)

  return (
    <PageLayout cartItemCount={cartSummary.totalItems} currentPage="checkout">
      <BackLink href="/cart">Back to Cart</BackLink>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <CheckoutForm cartItems={cartSummary.items} totalPrice={finalTotal} />
        </div>

        <div>
          <OrderSummary
            cartItems={cartSummary.items}
            totalPrice={cartSummary.subtotal}
            shipping={shipping}
            tax={tax}
            finalTotal={finalTotal}
          />
        </div>
      </div>
    </PageLayout>
  )
}
