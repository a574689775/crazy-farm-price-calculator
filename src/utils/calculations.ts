import type { FarmItem } from '@/types'

/**
 * 计算单个商品的小计
 */
export const calculateItemTotal = (item: FarmItem): number => {
  return item.price * item.quantity
}

/**
 * 计算所有商品的总价
 */
export const calculateTotalPrice = (items: FarmItem[]): number => {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
}

/**
 * 格式化价格显示
 */
export const formatPrice = (price: number): string => {
  return `¥${price}`
}

