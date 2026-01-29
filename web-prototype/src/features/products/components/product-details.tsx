import Image from 'next/image'
import type { ProductWithDetails } from '../types'
import { AddToCartButton } from '@/features/cart/components/add-to-cart-button'

interface ProductDetailsProps {
  product: ProductWithDetails
}

export function ProductDetails({ product }: ProductDetailsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-gray-100 rounded-lg overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={800}
          height={800}
          className="w-full h-auto object-cover"
          priority
        />
      </div>

      <div className="space-y-6">
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {product.categoryLabel}
          </span>
          <h1 className="text-3xl font-bold mt-1">{product.name}</h1>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          {product.description}
        </p>

        <div className="space-y-2">
          <div className="text-3xl font-bold">${product.price}</div>
          {product.inStock ? (
            <p className="text-sm text-green-600">In Stock ({product.stock})</p>
          ) : (
            <p className="text-sm text-red-600">Out of Stock</p>
          )}
        </div>

        <div>
          <AddToCartButton
            productId={product.id}
            disabled={!product.inStock}
            size="lg"
          />
        </div>
      </div>
    </div>
  )
}
