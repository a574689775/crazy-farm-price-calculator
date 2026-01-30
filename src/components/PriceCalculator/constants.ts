import type { WeatherMutation } from '@/types'

/**
 * 突变分组定义
 */
// 品质突变（互斥，只能选一个）
export const QUALITY_MUTATIONS: WeatherMutation[] = ['星空', '流光', '水晶', '金', '银']

// 月球突变（只有月球作物才有，太阳耀斑在中间状态突变里）
export const MOON_COMMON_MUTATIONS: WeatherMutation[] = ['流火', '日蚀', '暗雾', '陨石']

// 常见突变
export const COMMON_MUTATIONS: WeatherMutation[] = ['瓷化', '亮晶晶', '落雷', '冰冻', '颤栗', '覆雪', '潮湿', '迷雾', '生机']

// 罕见突变
export const RARE_MUTATIONS: WeatherMutation[] = ['霓虹', '星环', '血月', '彩虹', '荧光']

// 往期突变
export const PAST_MUTATIONS: WeatherMutation[] = ['极光', '幽魂', '惊魂夜']

// 中间状态突变（不显示checkbox，由合成规则自动生成）
export const INTERMEDIATE_MUTATIONS: WeatherMutation[] = ['陶化', '沙尘', '灼热', '结霜']

// 异形突变
export const SPECIAL_MUTATIONS: WeatherMutation[] = ['薯片', '方形', '糖葫芦', '连体', '黄瓜蛇', '万圣夜', '香蕉猴', '笑日葵']

/**
 * 合成规则：当同时存在这些突变时，会合成成目标突变
 */
export const COMBINATION_RULES: Array<{
  ingredients: WeatherMutation[] // 需要的突变组合
  result: WeatherMutation // 合成结果
}> = [
  { ingredients: ['沙尘', '潮湿'], result: '陶化' },
  { ingredients: ['陶化', '灼热'], result: '瓷化' },
  { ingredients: ['潮湿', '结霜'], result: '冰冻' },
  { ingredients: ['太阳耀斑', '灼热'], result: '流火' },
]
