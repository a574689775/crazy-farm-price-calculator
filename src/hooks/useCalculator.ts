import { useState, useCallback } from 'react'
import type { FarmItem } from '@/types'

/**
 * 计算器自定义 Hook
 */
export const useCalculator = (initialItems: FarmItem[]) => {
  const [items, setItems] = useState<FarmItem[]>(initialItems)

  const updateQuantity = useCallback((id: string, delta: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
    )
  }, [])

  const resetQuantities = useCallback(() => {
    setItems((prevItems) =>
      prevItems.map((item) => ({ ...item, quantity: 0 }))
    )
  }, [])

  return {
    items,
    updateQuantity,
    resetQuantities,
  }
}

