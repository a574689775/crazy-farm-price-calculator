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
  /** 用户收藏的作物名列表（用于展示星标状态） */
  favoriteCropNames?: string[]
  /** 切换当前作物收藏状态（乐观更新），完成后回调 onDone(success, isNowFavorite) 用于 toast */
  onToggleFavorite?: (cropName: string, onDone?: (success: boolean, isNowFavorite: boolean) => void) => void
}

/**
 * 计算模式
 * - weight: 按重量计算价格
 * - price: 按价格反推重量
 */
export type CalculationMode = 'weight' | 'price'
