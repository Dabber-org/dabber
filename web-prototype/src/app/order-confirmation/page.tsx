import { Suspense } from 'react'
import { orderService } from '@/features/orders/service'
import { PageLayout } from '@/shared/ui/layout/page-layout'
import { LoadingSpinner } from '@/shared/ui/components/loading-spinner'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface OrderConfirmationPageProps {
  searchParams: Promise<{ orderId?: string }>
}

async function OrderDetails({ orderId }: { orderId: string }) {
  const order = await orderService.getOrderById(orderId)

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Order not found</p>
        <Link href="/" className="text-primary-600 hover:text-primary-700">
          Return to Home
        </Link>
      </div>
    )
  }

  const products = orderService.parseOrderProducts(order.products)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-green-600 mb-2">Order Confirmed!</h1>
        <p className="text-muted-foreground">
          Thank you for your purchase. Your order has been received and is being processed.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Order Details</h2>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <span className="text-muted-foreground">Order ID:</span>
            <p className="font-mono">{order.id}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <p className="font-medium">{order.statusLabel}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Order Date:</span>
            <p>{new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>
            <p className="font-semibold text-lg">${order.totalPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Items Ordered ({order.itemCount})</h3>
          <div className="space-y-2">
            {products.map((product, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>
                  {product.name} × {product.quantity}
                </span>
                <span>${(product.price * product.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          You will receive an email confirmation shortly with tracking information.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            href="/"
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function OrderConfirmationPage({ searchParams }: OrderConfirmationPageProps) {
  const { orderId } = await searchParams

  if (!orderId) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">No order ID provided</p>
          <Link href="/" className="text-primary-600 hover:text-primary-700">
            Return to Home
          </Link>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <OrderDetails orderId={orderId} />
      </Suspense>
    </PageLayout>
  )
}
