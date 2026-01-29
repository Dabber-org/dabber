import { Suspense } from 'react'
import Link from 'next/link'
import { ProductGrid } from '@/features/products/components/product-grid'
import { CategoryFilter } from '@/features/products/components/category-filter'
import { PageLayout } from '@/shared/ui/layout/page-layout'
import { LoadingSpinner } from '@/shared/ui/components/loading-spinner'
import { CategorySchema } from '@/core/types/common'
import { productService } from '@/features/products/service'
import { cartService } from '@/features/cart/service'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HelpCircle, ArrowRight } from 'lucide-react'

interface HomePageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { category } = await searchParams

  const validCategory =
    category && CategorySchema.safeParse(category).success ? (category as 'mobile' | 'laptop' | 'pc') : undefined

  const products = await productService.getProducts({ category: validCategory })
  const cartSummary = await cartService.getCartSummary()

  const categoryLabel = validCategory
    ? `${validCategory.charAt(0).toUpperCase() + validCategory.slice(1)}s`
    : 'All Products'

  return (
    <PageLayout cartItemCount={cartSummary.totalItems} currentPage="home">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">{categoryLabel}</h1>
          <Suspense fallback={<LoadingSpinner />}>
            <CategoryFilter currentCategory={validCategory} />
          </Suspense>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <HelpCircle className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">Have Questions?</h2>
                  <p className="text-muted-foreground">
                    Check out our comprehensive FAQ page for answers to common questions about products, shipping, returns, and more.
                  </p>
                </div>
              </div>
              <Button asChild variant="default" size="lg">
                <Link href="/faq" className="flex items-center gap-2">
                  View FAQ
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Suspense fallback={<LoadingSpinner />}>
          <ProductGrid products={products} />
        </Suspense>
      </div>
    </PageLayout>
  )
}
