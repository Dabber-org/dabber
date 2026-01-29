'use client'

import { useState } from 'react'
import type { CartItem as CartItemType } from '@/core/types/common'
import { CartItem } from './cart-item'
import { env } from '@/core/config/env'
import { cartService } from '../service'

interface CartListProps {
  items: CartItemType[]
  onRefresh: () => void
}

export function CartList({ items, onRefresh }: CartListProps) {
  const [, setUpdatingItems] = useState<Set<string>>(new Set())

  const handleUpdateItem = async (id: string, quantity: number) => {
    setUpdatingItems((prev) => new Set(prev).add(id))

    try {
      const response = await fetch(`/api/cart/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })

      if (response.ok) {
        onRefresh()
      } else {
        throw new Error('Failed to update item')
      }
    } catch (error) {
      console.error('Error updating cart item:', error)
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleRemoveItem = async (id: string) => {
    setUpdatingItems((prev) => new Set(prev).add(id))

    try {
      const response = await cartService.removeFromCart(id)
      console.log('response', response)
      if (response) {
        onRefresh()
      } else {
        throw new Error('Failed to remove item')
      }
    } catch (error) {
      console.error('Error removing cart item:', error)
    } finally {
      setUpdatingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <CartItem key={item.id} item={item} onUpdate={handleUpdateItem} onRemove={handleRemoveItem} />
      ))}
    </div>
  )
}
