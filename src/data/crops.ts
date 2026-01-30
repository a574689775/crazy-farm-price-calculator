import type { CropConfig } from '@/types'

/**
 * 所有作物配置数据（原始）
 */
const rawCrops: CropConfig[] = [
  { name: '土豆', priceCoefficient: 26.3031, maxWeight: 11.90, growthSpeed: 28.5, type: '普通', specialMutations: ['薯片'] },
  { name: '香菇', priceCoefficient: 688.5300, maxWeight: 3.40, growthSpeed: 133, type: '普通' },
  { name: '番茄', priceCoefficient: 66.2400, maxWeight: 10.20, growthSpeed: 33.33, type: '普通' },
  { name: '波斯菊', priceCoefficient: 43.5412, maxWeight: 34.00, growthSpeed: 17, type: '普通' },
  { name: '大豆', priceCoefficient: 2579.6319, maxWeight: 3.40, growthSpeed: 275, type: '普通' },
  { name: '竹子', priceCoefficient: 12.2462, maxWeight: 136.00, growthSpeed: 7.5, type: '普通' },
  { name: '黄瓜', priceCoefficient: 215.0500, maxWeight: 13.60, growthSpeed: 50, type: '普通', specialMutations: ['黄瓜蛇'] },
  { name: '西瓜', priceCoefficient: 10.7108, maxWeight: 170.00, growthSpeed: 6, type: '普通', specialMutations: ['方形'] },
  { name: '梨', priceCoefficient: 225.1752, maxWeight: 13.60, growthSpeed: 75, type: '普通' },
  { name: '橘子', priceCoefficient: 537.9143, maxWeight: 13.60, growthSpeed: 75, type: '普通' },
  { name: '玉米', priceCoefficient: 103.5216, maxWeight: 40.80, growthSpeed: 27.78, type: '普通' },
  { name: '白菜', priceCoefficient: 579.7213, maxWeight: 10.20, growthSpeed: 80, type: '普通' },
  { name: '牵牛花', priceCoefficient: 2108.1851, maxWeight: 5.10, growthSpeed: 200, type: '普通' },
  { name: '棉花', priceCoefficient: 2586.0403, maxWeight: 5.20, growthSpeed: 200, type: '普通' },
  { name: '苹果', priceCoefficient: 188.7400, maxWeight: 37.40, growthSpeed: 40.5, type: '普通', specialMutations: ['糖葫芦'] },
  { name: '石榴', priceCoefficient: 257.0462, maxWeight: 20.00, growthSpeed: 83.5, type: '普通' },
  { name: '香蕉', priceCoefficient: 2484.5100, maxWeight: 10.20, growthSpeed: 280, type: '普通', specialMutations: ['香蕉猴'] },
  { name: '车厘子', priceCoefficient: 1656.3466, maxWeight: 10.50, growthSpeed: 166, type: '普通' },
  { name: '椰子', priceCoefficient: 144.9303, maxWeight: 40.80, growthSpeed: 32.5, type: '普通' },
  { name: '南瓜', priceCoefficient: 12.9629, maxWeight: 204.00, growthSpeed: 6.5, type: '普通', specialMutations: ['万圣夜'] },
  { name: '草莓', priceCoefficient: 8709.2900, maxWeight: 8.50, growthSpeed: 888, type: '普通', specialMutations: ['连体'] },
  { name: '猕猴桃', priceCoefficient: 2147.9800, maxWeight: 13.60, growthSpeed: 278, type: '普通' },
  { name: '荔枝', priceCoefficient: 790.2000, maxWeight: 23.80, growthSpeed: 135, type: '普通' },
  { name: '榴莲', priceCoefficient: 202.9569, maxWeight: 61.20, growthSpeed: 55.55, type: '普通' },
  { name: '向日葵', priceCoefficient: 370.3200, maxWeight: 51.00, growthSpeed: 80, type: '普通', specialMutations: ['笑日葵'] },
  { name: '松果', priceCoefficient: 4617.5778, maxWeight: 17.00, growthSpeed: 570, type: '普通' },
  { name: '大王菊', priceCoefficient: 24831.01, maxWeight: 10.20, growthSpeed: 2400, type: '普通' },
  { name: '葡萄', priceCoefficient: 24848.29, maxWeight: 10.20, growthSpeed: 2400, type: '普通' },
  { name: '蟠桃', priceCoefficient: 8779.15, maxWeight: 20.40, growthSpeed: 1333.33, type: '普通' },
  { name: '惊奇菇', priceCoefficient: 49652.11, maxWeight: 10.20, growthSpeed: 2400, type: '普通' },
  { name: '仙人掌象', priceCoefficient: 9527.5500, maxWeight: 34.00, growthSpeed: 720, type: '普通' },
  { name: '魔鬼朝天椒', priceCoefficient: 33144.42, maxWeight: 10.20, growthSpeed: 2400, type: '普通' },
  // 月球作物
  { name: '月光草', priceCoefficient: 332.73, maxWeight: 3.40, growthSpeed: 111, type: '月球' },
  { name: '灰壤豆', priceCoefficient: 1352.23, maxWeight: 3.40, growthSpeed: 180, type: '月球' },
  { name: '月灯草', priceCoefficient: 1479.51, maxWeight: 5.10, growthSpeed: 30.75, type: '月球' },
  { name: '月番茄', priceCoefficient: 662.48, maxWeight: 10.20, growthSpeed: 33.3, type: '月球' },
  { name: '月环树', priceCoefficient: 321.84, maxWeight: 20.40, growthSpeed: 34.8, type: '月球' },
  { name: '银灰苔', priceCoefficient: 3045.37, maxWeight: 5.10, growthSpeed: 42, type: '月球' },
  { name: '月莓', priceCoefficient: 3906.98, maxWeight: 8.5, growthSpeed: 0, type: '月球' },
  { name: '星叶菜', priceCoefficient: 3952.99, maxWeight: 10.2, growthSpeed: 0, type: '月球' },
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

