import type { CropConfig } from '@/types'

/**
 * 所有作物配置数据
 */
export const crops: CropConfig[] = [
  { name: '土豆', priceCoefficient: 25, maxWeight: 11.90, specialMutations: ['薯片'] },
  { name: '香菇', priceCoefficient: 688.53, maxWeight: 3.40 },
  { name: '番茄', priceCoefficient: 66.24, maxWeight: 10.20 },
  { name: '波斯菊', priceCoefficient: 43.54, maxWeight: 34.00 },
  { name: '大豆', priceCoefficient: 2500, maxWeight: 3.40 },
  { name: '竹子', priceCoefficient: 12.24, maxWeight: 136.00 },
  { name: '黄瓜', priceCoefficient: 215.05, maxWeight: 13.60, specialMutations: ['黄瓜蛇'] },
  { name: '西瓜', priceCoefficient: 10.71, maxWeight: 170.00, specialMutations: ['方形'] },
  { name: '梨', priceCoefficient: 486.86, maxWeight: 13.60 },
  { name: '橘子', priceCoefficient: 539.35, maxWeight: 13.60 },
  { name: '玉米', priceCoefficient: 100, maxWeight: 40.80 },
  { name: '白菜', priceCoefficient: 579.72, maxWeight: 10.20 },
  { name: '牵牛花', priceCoefficient: 2100, maxWeight: 5.10 },
  { name: '棉花', priceCoefficient: 188.72, maxWeight: 5.20 },
  { name: '苹果', priceCoefficient: 188.74, maxWeight: 37.40, specialMutations: ['糖葫芦'] },
  { name: '石榴', priceCoefficient: 528, maxWeight: 20.00 },
  { name: '香蕉', priceCoefficient: 2484.51, maxWeight: 10.20, specialMutations: ['香蕉猴'] },
  { name: '车厘子', priceCoefficient: 1670, maxWeight: 10.50 },
  { name: '椰子', priceCoefficient: 145, maxWeight: 40.80 },
  { name: '南瓜', priceCoefficient: 12.9, maxWeight: 204.00, specialMutations: ['万圣夜'] },
  { name: '草莓', priceCoefficient: 8709.29, maxWeight: 8.50, specialMutations: ['连体'] },
  { name: '猕猴桃', priceCoefficient: 2147.98, maxWeight: 13.60 },
  { name: '荔枝', priceCoefficient: 790.2, maxWeight: 23.80 },
  { name: '榴莲', priceCoefficient: 202.96, maxWeight: 61.20 },
  { name: '向日葵', priceCoefficient: 370.32, maxWeight: 51.00, specialMutations: ['笑日葵'] },
  { name: '松果', priceCoefficient: 4600, maxWeight: 17.00 },
  { name: '大王菊', priceCoefficient: 24824.68, maxWeight: 10.20 },
  { name: '葡萄', priceCoefficient: 24834.24, maxWeight: 10.20 },
  { name: '蟠桃', priceCoefficient: 8780.94, maxWeight: 20.40 },
  { name: '惊奇菇', priceCoefficient: 49650.99, maxWeight: 10.20 },
  { name: '仙人掌象', priceCoefficient: 9527.55, maxWeight: 34.00 },
  { name: '魔鬼朝天椒', priceCoefficient: 33142.8, maxWeight: 10.20 },
]

/**
 * 根据名称获取作物配置
 */
export const getCropByName = (name: string): CropConfig | undefined => {
  return crops.find(crop => crop.name === name)
}

