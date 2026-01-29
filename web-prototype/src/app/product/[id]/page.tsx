import { notFound } from 'next/navigation'
// Using API routes for data fetching
import { PageLayout } from '@/shared/ui/layout/page-layout'
import { BackLink } from '@/shared/ui/components/back-link'
import { ProductDetails } from '@/features/products/components/product-details'
import { env } from '@/core/config/env'
import { productService } from '@/features/products/service'
import { cartService } from '@/features/cart/service'
// Using API routes for data fetching

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const productPayload = await productService.getProductById(id)
  const cartSummary = await cartService.getCartSummary()

  const product = productPayload

  if (!product) return notFound()

  return (
    <PageLayout cartItemCount={cartSummary.totalItems}>
      <BackLink href="/">Back to products</BackLink>
      <ProductDetails product={product} />
    </PageLayout>
  )
}
