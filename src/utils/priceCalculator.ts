import type { CropConfig, WeatherMutation, CalculationResult } from '@/types'
import { getWeatherMutation } from '@/data/weatherMutations'

/**
 * 计算价格
 * 公式：价格 = 基础价格 * 先天突变倍数 * (重量的1.5次方) * (天气突变总倍数 + 1)
 * 先天突变：银、金、水晶、流光（只取选中先天突变中的最大倍数，默认 1）
 * 天气突变：其余突变，倍数相加后再 +1
 */
export const calculatePrice = (
  crop: CropConfig,
  weight: number,
  selectedMutations: WeatherMutation[]
): CalculationResult => {
  const INNATE_MUTATIONS = new Set<WeatherMutation>(['银', '金', '水晶', '流光'])

  let innateMultiplier = 1 // 先天突变倍数，取最大值
  let weatherMultiplierSum = 0 // 天气突变倍数求和

  selectedMutations.forEach(mutationName => {
    const mutation = getWeatherMutation(mutationName)
    if (!mutation) return

    if (INNATE_MUTATIONS.has(mutationName)) {
      // 只取先天突变中的最大倍数，避免累乘叠加
      innateMultiplier = Math.max(innateMultiplier, mutation.multiplier)
    } else {
      weatherMultiplierSum += mutation.multiplier
    }
  })

  // 计算价格：基础价格 * 先天突变倍数 * (重量的1.5次方) * (天气突变总倍数 + 1)
  const price = crop.priceCoefficient * innateMultiplier * Math.pow(weight, 1.5) * (weatherMultiplierSum + 1)

  return {
    // totalMultiplier 用于展示天气突变总倍数
    totalMultiplier: weatherMultiplierSum,
    price,
    formattedPrice: formatPrice(price),
  }
}

/**
 * 格式化价格
 * 输入单位：元（原始计算结果）
 * 逻辑：
 *  - >= 1亿：转为“亿”
 *  - >= 1万：转为“万”
 *  - 其他：保留元，四舍五入到整数或2位小数
 */
export const formatPrice = (price: number): string => {
  const WAN = 10_000
  const YI = 100_000_000

  if (price >= YI) {
    const val = price / YI
    return val % 1 === 0 ? `${val}亿` : `${val.toFixed(2)}亿`
  }

  if (price >= WAN) {
    const val = price / WAN
    return val % 1 === 0 ? `${val}万` : `${val.toFixed(2)}万`
  }

  // < 1万：保留元
  return price % 1 === 0 ? `${price}元` : `${price.toFixed(2)}元`
}

/**
 * 格式化重量
 */
export const formatWeight = (weight: number): string => {
  if (weight % 1 === 0) {
    return `${weight}kg`
  }
  return `${weight.toFixed(2)}kg`
}

