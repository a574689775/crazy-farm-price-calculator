import type { CropConfig } from '@/types'

/**
 * 所有作物配置数据（原始）
 */
const rawCrops: CropConfig[] = [
  { name: '土豆', priceCoefficient: 26.3031, maxWeight: 11.90, growthSpeed: 28.5, specialMutations: ['薯片'] },
  { name: '香菇', priceCoefficient: 688.5300, maxWeight: 3.40, growthSpeed: 133 },
  { name: '番茄', priceCoefficient: 66.2400, maxWeight: 10.20, growthSpeed: 33.33 },
  { name: '波斯菊', priceCoefficient: 43.5412, maxWeight: 34.00, growthSpeed: 17 },
  { name: '大豆', priceCoefficient: 2579.6319, maxWeight: 3.40, growthSpeed: 275 },
  { name: '竹子', priceCoefficient: 12.2462, maxWeight: 136.00, growthSpeed: 7.5 },
  { name: '黄瓜', priceCoefficient: 215.0500, maxWeight: 13.60, growthSpeed: 50, specialMutations: ['黄瓜蛇'] },
  { name: '西瓜', priceCoefficient: 10.7108, maxWeight: 170.00, growthSpeed: 6, specialMutations: ['方形'] },
  { name: '梨', priceCoefficient: 225.1752, maxWeight: 13.60, growthSpeed: 75 },
  { name: '橘子', priceCoefficient: 537.9143, maxWeight: 13.60, growthSpeed: 75 },
  { name: '玉米', priceCoefficient: 103.5216, maxWeight: 40.80, growthSpeed: 27.78 },
  { name: '白菜', priceCoefficient: 579.7213, maxWeight: 10.20, growthSpeed: 80 },
  { name: '牵牛花', priceCoefficient: 2108.1851, maxWeight: 5.10, growthSpeed: 200 },
  { name: '棉花', priceCoefficient: 2586.0403, maxWeight: 5.20, growthSpeed: 200 },
  { name: '苹果', priceCoefficient: 188.7400, maxWeight: 37.40, growthSpeed: 40.5, specialMutations: ['糖葫芦'] },
  { name: '石榴', priceCoefficient: 257.0462, maxWeight: 20.00, growthSpeed: 83.5 },
  { name: '香蕉', priceCoefficient: 2484.5100, maxWeight: 10.20, growthSpeed: 280, specialMutations: ['香蕉猴'] },
  { name: '车厘子', priceCoefficient: 1656.3466, maxWeight: 10.50, growthSpeed: 166 },
  { name: '椰子', priceCoefficient: 144.9303, maxWeight: 40.80, growthSpeed: 32.5 },
  { name: '南瓜', priceCoefficient: 12.9629, maxWeight: 204.00, growthSpeed: 6.5, specialMutations: ['万圣夜'] },
  { name: '草莓', priceCoefficient: 8709.2900, maxWeight: 8.50, growthSpeed: 888, specialMutations: ['连体'] },
  { name: '猕猴桃', priceCoefficient: 2147.9800, maxWeight: 13.60, growthSpeed: 278 },
  { name: '荔枝', priceCoefficient: 790.2000, maxWeight: 23.80, growthSpeed: 135 },
  { name: '榴莲', priceCoefficient: 202.9569, maxWeight: 61.20, growthSpeed: 55.55 },
  { name: '向日葵', priceCoefficient: 370.3200, maxWeight: 51.00, growthSpeed: 80, specialMutations: ['笑日葵'] },
  { name: '松果', priceCoefficient: 4617.5778, maxWeight: 17.00, growthSpeed: 570 },
  { name: '大王菊', priceCoefficient: 24824.6800, maxWeight: 10.20, growthSpeed: 2400 },
  { name: '葡萄', priceCoefficient: 24847.8479, maxWeight: 10.20, growthSpeed: 2400 },
  { name: '蟠桃', priceCoefficient: 8780.9400, maxWeight: 20.40, growthSpeed: 1333.33 },
  { name: '惊奇菇', priceCoefficient: 49650.9900, maxWeight: 10.20, growthSpeed: 2400 },
  { name: '仙人掌象', priceCoefficient: 9527.5500, maxWeight: 34.00, growthSpeed: 720 },
  { name: '魔鬼朝天椒', priceCoefficient: 33149.0569, maxWeight: 10.20, growthSpeed: 2400 },
]

/**
 * 导出时将 priceCoefficient 统一保留 4 位小数
 */
export const crops: CropConfig[] = rawCrops.map(crop => ({
  ...crop,
  priceCoefficient: Number(crop.priceCoefficient.toFixed(4)),
}))

/**
 * 根据名称获取作物配置
 */
export const getCropByName = (name: string): CropConfig | undefined => {
  return crops.find(crop => crop.name === name)
}

