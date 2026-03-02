import type { CropConfig } from '@/types'

/**
 * 所有作物配置数据（原始）
 */
const rawCrops: CropConfig[] = [
  { name: '土豆', priceCoefficient: 26.3026, maxWeight: 11.90, growthSpeed: 28.5, type: '普通', specialMutations: ['薯片'] },
  { name: '香菇', priceCoefficient: 687.682, maxWeight: 3.40, growthSpeed: 133, type: '普通' },
  { name: '番茄', priceCoefficient: 66.2398, maxWeight: 10.20, growthSpeed: 33.33, type: '普通' },
  { name: '波斯菊', priceCoefficient: 43.5424, maxWeight: 34.00, growthSpeed: 17, type: '普通' },
  { name: '大豆', priceCoefficient: 2579.0104, maxWeight: 3.40, growthSpeed: 275, type: '普通' },
  { name: '竹子', priceCoefficient: 12.2462, maxWeight: 136.00, growthSpeed: 7.5, type: '普通' },
  { name: '黄瓜', priceCoefficient: 215.0425, maxWeight: 13.60, growthSpeed: 50, type: '普通', specialMutations: ['黄瓜蛇'] },
  { name: '西瓜', priceCoefficient: 10.7111, maxWeight: 170.00, growthSpeed: 6, type: '普通', specialMutations: ['方形'] },
  { name: '梨', priceCoefficient: 484.155, maxWeight: 13.60, growthSpeed: 75, type: '普通' },
  { name: '橘子', priceCoefficient: 537.9143, maxWeight: 13.60, growthSpeed: 75, type: '普通' },
  { name: '玉米', priceCoefficient: 103.5096, maxWeight: 40.80, growthSpeed: 27.78, type: '普通' },
  { name: '白菜', priceCoefficient: 579.7213, maxWeight: 10.20, growthSpeed: 80, type: '普通' },
  { name: '牵牛花', priceCoefficient: 2108.1851, maxWeight: 5.10, growthSpeed: 200, type: '普通' },
  { name: '棉花', priceCoefficient: 2578.4733, maxWeight: 5.20, growthSpeed: 200, type: '普通' },
  { name: '苹果', priceCoefficient: 188.7409, maxWeight: 37.40, growthSpeed: 40.5, type: '普通', specialMutations: ['糖葫芦'] },
  { name: '石榴', priceCoefficient: 527.5836, maxWeight: 20.00, growthSpeed: 83.5, type: '普通' },
  { name: '香蕉', priceCoefficient: 2484.6553, maxWeight: 10.20, growthSpeed: 280, type: '普通', specialMutations: ['香蕉猴'] },
  { name: '车厘子', priceCoefficient: 1657.661, maxWeight: 10.50, growthSpeed: 166, type: '普通' },
  { name: '椰子', priceCoefficient: 145.9826, maxWeight: 40.80, growthSpeed: 32.5, type: '普通' },
  { name: '南瓜', priceCoefficient: 12.9595, maxWeight: 204.00, growthSpeed: 6.5, type: '普通', specialMutations: ['万圣夜'] },
  { name: '草莓', priceCoefficient: 8702.3915, maxWeight: 8.50, growthSpeed: 888, type: '普通', specialMutations: ['连体'] },
  { name: '猕猴桃', priceCoefficient: 2147.9813, maxWeight: 13.60, growthSpeed: 278, type: '普通' },
  { name: '荔枝', priceCoefficient: 790.1983, maxWeight: 23.80, growthSpeed: 135, type: '普通' },
  { name: '榴莲', priceCoefficient: 202.944, maxWeight: 61.20, growthSpeed: 55.55, type: '普通' },
  { name: '向日葵', priceCoefficient: 370.3206, maxWeight: 51.00, growthSpeed: 80, type: '普通', specialMutations: ['笑日葵'] },
  { name: '松果', priceCoefficient: 4614.5318, maxWeight: 17.00, growthSpeed: 570, type: '普通' },
  { name: '大王菊', priceCoefficient: 24833.3587, maxWeight: 10.20, growthSpeed: 2400, type: '普通' },
  { name: '葡萄', priceCoefficient: 24836.8915, maxWeight: 10.20, growthSpeed: 2400, type: '普通' },
  { name: '蟠桃', priceCoefficient: 8780.9359, maxWeight: 20.40, growthSpeed: 1333.33, type: '普通' },
  { name: '惊奇菇', priceCoefficient: 49659.0636, maxWeight: 10.20, growthSpeed: 2400, type: '普通' },
  { name: '仙人掌象', priceCoefficient: 9525.0487, maxWeight: 34.00, growthSpeed: 720, type: '普通' },
  { name: '魔鬼朝天椒', priceCoefficient: 33143.6022, maxWeight: 10.20, growthSpeed: 2400, type: '普通' },
  // 月球作物
  { name: '月光草', priceCoefficient: 330.8416, maxWeight: 3.40, growthSpeed: 111, type: '月球' },
  { name: '灰壤豆', priceCoefficient: 1351.1872, maxWeight: 3.40, growthSpeed: 180, type: '月球' },
  { name: '月灯草', priceCoefficient: 1503.7848, maxWeight: 5.10, growthSpeed: 205, type: '月球' },
  { name: '月番茄', priceCoefficient: 662.4846, maxWeight: 10.20, growthSpeed: 111, type: '月球' },
  { name: '月环树', priceCoefficient: 321.9977, maxWeight: 20.40, growthSpeed: 58, type: '月球' },
  { name: '银灰苔', priceCoefficient: 3045.3677, maxWeight: 5.10, growthSpeed: 280, type: '月球' },
  { name: '月莓', priceCoefficient: 3920.9188, maxWeight: 8.5, growthSpeed: 375, type: '月球' },
  { name: '星叶菜', priceCoefficient: 3973.0842, maxWeight: 10.2, growthSpeed: 416, type: '月球' },
  { name: '月核树', priceCoefficient: 3379.796, maxWeight: 17, growthSpeed: 460, type: '月球' },
  { name: '液光藤', priceCoefficient: 3514.7133, maxWeight: 20.4, growthSpeed: 520, type: '月球' },
  { name: '幻月花', priceCoefficient: 8367.4002, maxWeight: 23.8, growthSpeed: 1142.5, type: '月球' },
  { name: '星空玫瑰', priceCoefficient: 33134.0877, maxWeight: 10.2, growthSpeed: 2966.6, type: '月球' },
  { name: '月兔', priceCoefficient: 11165.4521, maxWeight: 23.8, growthSpeed: 1524, type: '月球' },
  { name: '红包树', priceCoefficient: 83565.844, maxWeight: 5.10, growthSpeed: 5270, type: '月球' },
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

/** 使用「作物名称1.png」的作物（其余为「作物名称.png」） */
const CROPS_IMAGE_NAME_SUFFIX_1 = new Set<string>(['月兔', '红包树', '星空玫瑰'])

/**
 * 根据作物名称返回图片路径（/carzyfarm/xxx.png 或 /carzyfarm/xxx1.png）
 */
export const getCropImagePath = (cropName: string): string => {
  const filename = CROPS_IMAGE_NAME_SUFFIX_1.has(cropName) ? `${cropName}1.png` : `${cropName}.png`
  return `/carzyfarm/${filename}`
}

