import Image from 'next/image'
import Link from 'next/link'
import type { ProductWithDetails } from '../types'
import { AddToCartButton } from '@/features/cart/components/add-to-cart-button'

interface ProductCardProps {
  product: ProductWithDetails
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow duration-200">
      <Link href={`/product/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden rounded-t-lg bg-gray-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={300}
            height={300}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      </Link>

      <div className="p-4 space-y-3">
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {product.categoryLabel}
          </span>
          <Link href={`/product/${product.id}`}>
            <h3 className="font-semibold text-lg leading-tight hover:text-primary-600 transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-2xl font-bold">${product.price}</span>
            {product.inStock ? (
              <p className="text-xs text-green-600">
                In Stock ({product.stock})
              </p>
            ) : (
              <p className="text-xs text-red-600">Out of Stock</p>
            )}
          </div>

          <AddToCartButton
            productId={product.id}
            disabled={!product.inStock}
            size="sm"
          />
        </div>
      </div>
    </div>
  )
}
