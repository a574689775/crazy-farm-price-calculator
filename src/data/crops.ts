import type { CropConfig } from '@/types'

/**
 * 所有作物配置数据
 */
export const crops: CropConfig[] = [
  { name: '土豆', priceCoefficient: 25, maxWeight: 12.00, weatherMutations: 81, specialMutations: ['薯片'], maxPrices: { '普通': 8.52, '银': 25.57, '金': 85.22, '水晶': 170.43, '流光': 255.65 } },
  { name: '香菇', priceCoefficient: 688.53, maxWeight: 3.45, weatherMutations: 81, maxPrices: { '普通': 36.18, '银': 108.54, '金': 361.80, '水晶': 723.59, '流光': 1085.39 } },
  { name: '番茄', priceCoefficient: 65, maxWeight: 10.20, weatherMutations: 81, maxPrices: { '普通': 17.36, '银': 52.09, '金': 173.63, '水晶': 347.26, '流光': 520.89 } },
  { name: '波斯菊', priceCoefficient: 43.54, maxWeight: 34.20, weatherMutations: 81, maxPrices: { '普通': 71.41, '银': 214.22, '金': 714.07, '水晶': 1428.14, '流光': 2142.21 } },
  { name: '大豆', priceCoefficient: 2500, maxWeight: 3.50, weatherMutations: 81, maxPrices: { '普通': 134.23, '银': 402.70, '金': 1342.32, '水晶': 2684.64, '流光': 4026.96 } },
  { name: '竹子', priceCoefficient: 12.24, maxWeight: 135.00, weatherMutations: 81, maxPrices: { '普通': 157.43, '银': 472.30, '金': 1574.33, '水晶': 3148.66, '流光': 4722.99 } },
  { name: '黄瓜', priceCoefficient: 215.16, maxWeight: 13.50, weatherMutations: 81, specialMutations: ['黄瓜蛇'], maxPrices: { '普通': 87.51, '银': 262.54, '金': 875.14, '水晶': 1750.27, '流光': 2625.41 } },
  { name: '西瓜', priceCoefficient: 10.71, maxWeight: 170.00, weatherMutations: 81, specialMutations: ['方形'], maxPrices: { '普通': 194.66, '银': 583.98, '金': 1946.60, '水晶': 3893.20, '流光': 5839.80 } },
  { name: '梨', priceCoefficient: 486.86, maxWeight: 13.60, weatherMutations: 81, maxPrices: { '普通': 200.23, '银': 600.69, '金': 2002.29, '水晶': 4004.57, '流光': 6006.86 } },
  { name: '橘子', priceCoefficient: 539.35, maxWeight: 13.50, weatherMutations: 81, maxPrices: { '普通': 219.37, '银': 658.12, '金': 2193.74, '水晶': 4387.48, '流光': 6581.22 } },
  { name: '玉米', priceCoefficient: 100, maxWeight: 40.80, weatherMutations: 81, maxPrices: { '普通': 213.70, '银': 641.10, '金': 2137.00, '水晶': 4274.00, '流光': 6410.99 } },
  { name: '白菜', priceCoefficient: 579.72, maxWeight: 10.20, weatherMutations: 81, maxPrices: { '普通': 154.86, '银': 464.57, '金': 1548.58, '水晶': 3097.15, '流光': 4645.73 } },
  { name: '牵牛花', priceCoefficient: 2100, maxWeight: 5.20, weatherMutations: 81, maxPrices: { '普通': 204.19, '银': 612.58, '金': 2041.92, '水晶': 4083.83, '流光': 6125.75 } },
  { name: '棉花', priceCoefficient: 188.72, maxWeight: 5.20, weatherMutations: 81, maxPrices: { '普通': 18.35, '银': 55.05, '金': 183.50, '水晶': 367.00, '流光': 550.50 } },
  { name: '苹果', priceCoefficient: 188.6, maxWeight: 37.40, weatherMutations: 81, specialMutations: ['糖葫芦'], maxPrices: { '普通': 353.72, '银': 1061.17, '金': 3537.23, '水晶': 7074.45, '流光': 10611.68 } },
  { name: '石榴', priceCoefficient: 528, maxWeight: 20.00, weatherMutations: 81, maxPrices: { '普通': 387.25, '银': 1161.75, '金': 3872.51, '水晶': 7745.02, '流光': 11617.54 } },
  { name: '香蕉', priceCoefficient: 2484.51, maxWeight: 10.20, weatherMutations: 81, specialMutations: ['香蕉猴'], maxPrices: { '普通': 663.67, '银': 1991.02, '金': 6636.74, '水晶': 13273.48, '流光': 19910.22 } },
  { name: '车厘子', priceCoefficient: 1670, maxWeight: 10.50, weatherMutations: 81, maxPrices: { '普通': 465.92, '银': 1397.77, '金': 4659.23, '水晶': 9318.46, '流光': 13977.69 } },
  { name: '椰子', priceCoefficient: 145, maxWeight: 41.20, weatherMutations: 81, maxPrices: { '普通': 314.43, '银': 943.30, '金': 3144.33, '水晶': 6288.65, '流光': 9432.98 } },
  { name: '南瓜', priceCoefficient: 12.9, maxWeight: 205.00, weatherMutations: 81, specialMutations: ['万圣夜'], maxPrices: { '普通': 310.48, '银': 931.44, '金': 3104.81, '水晶': 6209.61, '流光': 9314.42 } },
  { name: '草莓', priceCoefficient: 8709.29, maxWeight: 8.50, weatherMutations: 81, specialMutations: ['连体'], maxPrices: { '普通': 1769.80, '银': 5309.41, '金': 17698.03, '水晶': 35396.07, '流光': 53094.10 } },
  { name: '猕猴桃', priceCoefficient: 2100, maxWeight: 13.50, weatherMutations: 81, maxPrices: { '普通': 854.15, '银': 2562.45, '金': 8541.49, '水晶': 17082.99, '流光': 25624.48 } },
  { name: '荔枝', priceCoefficient: 790.2, maxWeight: 24.50, weatherMutations: 81, maxPrices: { '普通': 201.35, '银': 604.04, '金': 2013.47, '水晶': 4026.94, '流光': 6040.41 } },
  { name: '榴莲', priceCoefficient: 790.19, maxWeight: 61.50, weatherMutations: 81, maxPrices: { '普通': 3125.06, '银': 9375.17, '金': 31250.58, '水晶': 62501.16, '流光': 93751.73 } },
  { name: '向日葵', priceCoefficient: 370, maxWeight: 51.00, weatherMutations: 81, specialMutations: ['笑日葵'], maxPrices: { '普通': 1105.02, '银': 3315.07, '金': 11050.22, '水晶': 22100.44, '流光': 33150.65 } },
  { name: '松果', priceCoefficient: 4600, maxWeight: 17.00, weatherMutations: 81, maxPrices: { '普通': 2643.90, '银': 7931.70, '金': 26439.00, '水晶': 52878.01, '流光': 79317.01 } },
  { name: '大王菊', priceCoefficient: 24827.26, maxWeight: 10.20, weatherMutations: 81, maxPrices: { '普通': 6678.12, '银': 20034.36, '金': 66781.18, '水晶': 133562.37, '流光': 200343.55 } },
  { name: '葡萄', priceCoefficient: 24832.04, maxWeight: 10.20, weatherMutations: 81, maxPrices: { '普通': 6633.25, '银': 19899.76, '金': 66332.52, '水晶': 132665.04, '流光': 198997.56 } },
  { name: '蟠桃', priceCoefficient: 8782.12, maxWeight: 20.40, weatherMutations: 81, maxPrices: { '普通': 6635.27, '银': 19905.81, '金': 66352.68, '水晶': 132705.36, '流光': 199058.04 } },
  { name: '惊奇菇', priceCoefficient: 49662.01, maxWeight: 10.20, weatherMutations: 81, maxPrices: { '普通': 13265.98, '银': 39797.92, '金': 132659.73, '水晶': 265319.46, '流光': 397979.19 } },
  { name: '仙人掌象', priceCoefficient: 9527.55, maxWeight: 34.00, weatherMutations: 81, maxPrices: { '普通': 15488.64, '银': 46465.94, '金': 154886.46, '水晶': 309772.93, '流光': 464659.39 } },
  { name: '魔鬼朝天椒', priceCoefficient: 33142.8, maxWeight: 10.20, weatherMutations: 81, maxPrices: { '普通': 8848.77, '银': 26546.29, '金': 88487.63, '水晶': 176975.27, '流光': 265462.90 } },
]

/**
 * 根据名称获取作物配置
 */
export const getCropByName = (name: string): CropConfig | undefined => {
  return crops.find(crop => crop.name === name)
}

