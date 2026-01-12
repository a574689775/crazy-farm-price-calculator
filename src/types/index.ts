/**
 * 品质类型（果实本身的品质）
 */
export type Quality = '普通' | '银' | '金' | '水晶' | '流光'

/**
 * 突变颜色类型（用于样式区分）
 */
export type MutationColor = '灰色' | '绿色' | '蓝色' | '紫色' | '金色' | '彩色'

/**
 * 天气突变类型
 */
export type WeatherMutation = 
  | '颤栗' | '潮湿' | '覆雪' | '灼热' | '迷雾' | '生机' | '沙尘' | '结霜'  // 灰色
  | '银' | '落雷' | '冰冻' | '陶化'  // 绿色
  | '金' | '血月' | '幽魂' | '惊魂夜' | '彩虹' | '荧光' | '极光'  // 蓝色
  | '瓷化' | '星环' | '亮晶晶'  // 紫色
  | '水晶'  // 金色
  | '流光' | '霓虹'  // 彩色

/**
 * 天气突变配置
 */
export interface WeatherMutationConfig {
  name: WeatherMutation
  color: MutationColor  // 突变颜色（用于样式）
  multiplier: number  // 倍数
}

/**
 * 作物配置
 */
export interface CropConfig {
  name: string
  priceCoefficient: number  // 售价系数
  maxWeight: number  // 极限重量 (kg)
  weatherMutations: number  // 天气突变数量
  maxPrices: {
    [K in Quality]: number  // 各品质最大价格 (W)
  }
}

/**
 * 计算器输入
 */
export interface CalculatorInput {
  crop: CropConfig | null
  weight: number  // 重量 (kg)
  selectedMutations: WeatherMutation[]  // 选中的天气突变
}

/**
 * 计算结果
 */
export interface CalculationResult {
  totalMultiplier: number  // 突变总倍数
  price: number  // 价格 (W)
  formattedPrice: string  // 格式化后的价格（自动转换为亿或W）
}
