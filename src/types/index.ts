/**
 * 农产品项类型
 */
export interface FarmItem {
  id: string
  name: string
  price: number
  quantity: number
}

/**
 * 计算器状态类型
 */
export interface CalculatorState {
  items: FarmItem[]
}

