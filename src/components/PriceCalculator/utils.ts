import type { WeatherMutation } from '@/types'
import { COMBINATION_RULES, QUALITY_MUTATIONS, SPECIAL_MUTATIONS } from './constants'

/**
 * 分享文案模版（有异形突变）
 */
export const shareTemplatesWithSpecial = [
  (quality: string, special: string) => `我的${quality}${special}居然这么值钱？`,
  (quality: string, special: string) => `没想到${quality}${special}能卖这个价！`,
  (quality: string, special: string) => `${quality}${special}的价格也太夸张了吧`,
  (quality: string, special: string) => `我的${quality}${special}竟然值这么多？`,
  (quality: string, special: string) => `${quality}${special}这个价格你敢信？`,
  (quality: string, special: string) => `看看我的${quality}${special}值多少钱`,
]

/**
 * 分享文案模版（无异形突变）
 */
export const shareTemplatesWithoutSpecial = [
  (quality: string, cropName: string) => `我的${quality}${cropName}居然这么值钱？`,
  (quality: string, cropName: string) => `没想到${quality}${cropName}能卖这个价！`,
  (quality: string, cropName: string) => `${quality}${cropName}的价格也太夸张了吧`,
  (quality: string, cropName: string) => `我的${quality}${cropName}竟然值这么多？`,
  (quality: string, cropName: string) => `${quality}${cropName}这个价格你敢信？`,
  (quality: string, cropName: string) => `看看我的${quality}${cropName}值多少钱`,
]

/**
 * 获取当前选中的品质突变（银、金、水晶、流光）
 */
export const getSelectedQuality = (selectedMutations: WeatherMutation[]): string => {
  const quality = selectedMutations.find(m => QUALITY_MUTATIONS.includes(m))
  return quality || '普通'
}

/**
 * 获取当前选中的异形突变
 */
export const getSelectedSpecial = (selectedMutations: WeatherMutation[]): string | null => {
  const special = selectedMutations.find(m => SPECIAL_MUTATIONS.includes(m))
  return special || null
}

/**
 * 递归获取所有间接合成条件（包括子流程）
 * 
 * @param result 目标突变
 * @param visited 已访问的突变集合（防止循环）
 * @returns 所有合成条件（包括间接的）
 */
export const getAllIngredients = (
  result: WeatherMutation,
  visited: Set<WeatherMutation> = new Set()
): WeatherMutation[] => {
  if (visited.has(result)) return []
  visited.add(result)
  
  const allIngredients: WeatherMutation[] = []
  for (const rule of COMBINATION_RULES) {
    if (rule.result === result) {
      // 添加直接合成条件
      allIngredients.push(...rule.ingredients)
      // 递归获取间接合成条件（如果合成条件本身也是合成结果）
      for (const ingredient of rule.ingredients) {
        const indirectIngredients = getAllIngredients(ingredient, visited)
        allIngredients.push(...indirectIngredients)
      }
    }
  }
  return allIngredients
}

/**
 * 检查某个突变是否因为合成结果存在而被禁用
 * 规则：
 * 1. 如果合成结果已存在，除了潮湿以外的所有合成条件（包括间接的）都禁用
 * 2. 潮湿比较特殊：即使"陶化"或"瓷化"存在，潮湿也不禁用
 * 3. 但是"沙尘"不能和"潮湿"共存（因为会合成"陶化"）
 * 
 * @param mutationName 要检查的突变名称
 * @param selectedMutations 当前选中的突变列表
 * @returns 是否被禁用
 */
export const isMutationDisabled = (
  mutationName: WeatherMutation,
  selectedMutations: WeatherMutation[]
): boolean => {
  // 潮湿比较特殊，即使"陶化"或"瓷化"存在，潮湿也不禁用
  if (mutationName === '潮湿') {
    return false
  }
  
  // 特殊处理："沙尘"不能和"潮湿"共存（因为会合成"陶化"）
  // 但是只有当"陶化"或"瓷化"已存在时，才禁用"沙尘"（说明已经合成了，不能再选择原料）
  // 如果"陶化"和"瓷化"都不存在，允许选择"沙尘"（即使"潮湿"已存在，让用户自己选择是否合成）
  if (mutationName === '沙尘' && selectedMutations.includes('潮湿')) {
    // 只有当"陶化"或"瓷化"已存在时，才禁用"沙尘"（因为已经合成了，不能再选择原料）
    if (selectedMutations.includes('陶化') || selectedMutations.includes('瓷化')) {
      return true
    }
    // 如果"陶化"和"瓷化"都不存在，允许选择"沙尘"（即使"潮湿"已存在，选择"沙尘"会触发合成）
    return false
  }
  
  // 检查所有合成结果，看这个突变是否是它们的合成条件（包括间接的）
  for (const rule of COMBINATION_RULES) {
    if (selectedMutations.includes(rule.result)) {
      // 获取所有合成条件（包括间接的）
      const allIngredients = getAllIngredients(rule.result)
      // 排除"潮湿"，因为潮湿比较特殊
      const ingredientsWithoutShi = allIngredients.filter(ing => ing !== '潮湿')
      if (ingredientsWithoutShi.includes(mutationName)) {
        return true
      }
    }
  }
  return false
}

/**
 * 检查并应用合成规则
 * 当同时存在合成规则所需的突变时，自动移除原料并添加合成结果
 * 
 * @param mutations 突变列表
 * @returns 应用合成规则后的突变列表
 */
export const applyCombinations = (mutations: WeatherMutation[]): WeatherMutation[] => {
  let result = [...mutations]
  let changed = true
  
  // 循环检测直到没有新的合成
  while (changed) {
    changed = false
    for (const rule of COMBINATION_RULES) {
      // 检查是否同时包含所有需要的突变
      const hasAllIngredients = rule.ingredients.every(ing => result.includes(ing))
      const hasResult = result.includes(rule.result)
      
      if (hasAllIngredients && !hasResult) {
        // 移除所有原料，添加合成结果
        result = result.filter(m => !rule.ingredients.includes(m))
        result.push(rule.result)
        changed = true
        break
      }
    }
  }
  
  return result
}
