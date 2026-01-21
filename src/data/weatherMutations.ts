import type { WeatherMutationConfig, WeatherMutation, MutationColor } from '@/types'

/**
 * 天气突变配置数据（按颜色分类）
 */
export const weatherMutations: WeatherMutationConfig[] = [
  // 灰色突变
  { name: '颤栗', color: '灰色', multiplier: 1 },
  { name: '潮湿', color: '灰色', multiplier: 1 },
  { name: '覆雪', color: '灰色', multiplier: 2 },
  { name: '灼热', color: '灰色', multiplier: 2 },
  { name: '迷雾', color: '灰色', multiplier: 2 },
  { name: '生机', color: '灰色', multiplier: 2 },
  { name: '沙尘', color: '灰色', multiplier: 2 },
  { name: '结霜', color: '灰色', multiplier: 2 },
  
  // 绿色突变
  { name: '银', color: '绿色', multiplier: 3 },
  { name: '落雷', color: '绿色', multiplier: 3 },
  { name: '冰冻', color: '绿色', multiplier: 4 },
  { name: '陶化', color: '绿色', multiplier: 4 },
  
  // 蓝色突变
  { name: '金', color: '蓝色', multiplier: 10 },
  { name: '血月', color: '蓝色', multiplier: 5 },
  { name: '幽魂', color: '蓝色', multiplier: 5 },
  { name: '惊魂夜', color: '蓝色', multiplier: 5 },
  { name: '彩虹', color: '蓝色', multiplier: 5 },
  { name: '荧光', color: '蓝色', multiplier: 5 },
  { name: '极光', color: '蓝色', multiplier: 5 },
  
  // 紫色突变
  { name: '瓷化', color: '紫色', multiplier: 8 },
  { name: '星环', color: '紫色', multiplier: 10 },
  { name: '亮晶晶', color: '紫色', multiplier: 10 },
  
  // 金色突变
  { name: '水晶', color: '金色', multiplier: 20 },
  
  // 彩色突变
  { name: '流光', color: '彩色', multiplier: 30 },
  { name: '霓虹', color: '彩色', multiplier: 18 },
  
  // 异形突变（紫色品质）
  { name: '薯片', color: '紫色', multiplier: 1.5 },
  { name: '方形', color: '紫色', multiplier: 1.5 },
  { name: '糖葫芦', color: '紫色', multiplier: 1.5 },
  { name: '连体', color: '紫色', multiplier: 1.5 },
  
  // 异形突变（金色品质）
  { name: '黄瓜蛇', color: '金色', multiplier: 2.5 },
  { name: '万圣夜', color: '金色', multiplier: 2 },
  { name: '香蕉猴', color: '金色', multiplier: 2 },
  
  // 异形突变（彩色品质）
  { name: '笑日葵', color: '彩色', multiplier: 10 },
]

/**
 * 根据名称获取天气突变配置
 */
export const getWeatherMutation = (name: WeatherMutation): WeatherMutationConfig | undefined => {
  return weatherMutations.find(m => m.name === name)
}

/**
 * 根据颜色获取天气突变列表
 */
export const getWeatherMutationsByColor = (color: MutationColor): WeatherMutationConfig[] => {
  return weatherMutations.filter(m => m.color === color)
}

/**
 * 突变颜色配置（用于样式）
 */
export const mutationColorConfig: Record<MutationColor, { label: string; bgColor: string; textColor: string; gradient?: string }> = {
  '灰色': { label: '灰色突变', bgColor: '#96B2C6', textColor: '#fff' },
  '绿色': { label: '绿色突变', bgColor: '#27D777', textColor: '#fff' },
  '蓝色': { label: '蓝色突变', bgColor: '#65C7FF', textColor: '#fff' },
  '紫色': { label: '紫色突变', bgColor: '#D990F9', textColor: '#fff' },
  '金色': { 
    label: '金色突变', 
    bgColor: 'rgba(245, 130, 50, 1)', 
    textColor: '#fff',
    gradient: 'linear-gradient(90deg, rgba(245, 130, 50, 1) 0%, rgba(255, 186, 49, 1) 100%)'
  },
  '彩色': { 
    label: '彩色突变', 
    bgColor: 'rgba(121, 229, 255, 1)', 
    textColor: '#fff',
    gradient: 'linear-gradient(90deg, rgba(121, 229, 255, 1) 0%, rgba(238, 141, 250, 1) 49%, rgba(121, 229, 255, 1) 100%)'
  },
}
