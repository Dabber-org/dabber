'use client'

import { useState } from 'react'
import { ShoppingCart, Plus } from 'lucide-react'
import { cn } from '@/core/utils/cn'
import { env } from '@/core/config/env'

interface AddToCartButtonProps {
  productId: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline'
}

export function AddToCartButton({
  productId,
  disabled = false,
  size = 'md',
  variant = 'default',
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAdded, setIsAdded] = useState(false)

  const handleAddToCart = async () => {
    if (disabled || isLoading) return

    setIsLoading(true)

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      })

      if (response.ok) {
        setIsAdded(true)
        setTimeout(() => setIsAdded(false), 2000)
      } else {
        throw new Error('Failed to add to cart')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const variantClasses = {
    default: 'bg-black hover:bg-gray-800 text-white',
    outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50',
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center gap-2 font-medium rounded-md transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        isAdded && 'bg-green-600 hover:bg-green-700'
      )}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      {isAdded ? 'Added!' : size === 'sm' ? <Plus className="h-4 w-4" /> : 'Add to Cart'}
    </button>
  )
}
