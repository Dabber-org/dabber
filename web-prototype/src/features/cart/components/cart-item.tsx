'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '@/core/types/common'
import { cn } from '@/core/utils/cn'

interface CartItemProps {
  item: CartItem
  onUpdate: (id: string, quantity: number) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

export function CartItem({ item, onUpdate, onRemove }: CartItemProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || isUpdating) return

    setIsUpdating(true)
    try {
      await onUpdate(item.id, newQuantity)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = async () => {
    if (isRemoving) return

    setIsRemoving(true)
    try {
      await onRemove(item.id)
    } finally {
      setIsRemoving(false)
    }
  }

  const itemTotal = item.product.price * item.quantity

  return (
    <div
      className={cn(
        'flex gap-4 p-4 bg-card rounded-lg border',
        (isUpdating || isRemoving) && 'opacity-50 pointer-events-none'
      )}
    >
      <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-md overflow-hidden">
        <Image
          src={item.product.imageUrl}
          alt={item.product.name}
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-lg leading-tight">
          {item.product.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {item.product.category.charAt(0).toUpperCase() +
            item.product.category.slice(1)}
        </p>
        <p className="text-lg font-semibold mt-2">${item.product.price}</p>
      </div>

      <div className="flex flex-col items-end gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={item.quantity <= 1 || isUpdating}
            className="p-1 rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus className="h-4 w-4" />
          </button>

          <span className="w-12 text-center font-medium">{item.quantity}</span>

          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isUpdating}
            className="p-1 rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="text-right">
          <p className="font-semibold text-lg">${itemTotal.toFixed(2)}</p>
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1 mt-1"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
