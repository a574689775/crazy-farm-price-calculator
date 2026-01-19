import type { CropConfig, WeatherMutation } from '@/types'

/**
 * 计算器组件 Props
 */
export interface PriceCalculatorProps {
  crop: CropConfig | null
  onBack?: () => void
  prefillData?: {
    weight: number
    mutations: WeatherMutation[]
  }
}

/**
 * 计算模式
 * - weight: 按重量计算价格
 * - price: 按价格反推重量
 */
export type CalculationMode = 'weight' | 'price'
