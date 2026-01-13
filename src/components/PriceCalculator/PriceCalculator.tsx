import { useState, useEffect } from 'react'
import type { CropConfig, WeatherMutation } from '@/types'
import { weatherMutations, mutationColorConfig } from '@/data/weatherMutations'
import { calculatePrice } from '@/utils/priceCalculator'
import './PriceCalculator.css'

interface PriceCalculatorProps {
  crop: CropConfig | null
  onBack?: () => void
}

// 突变分组
const QUALITY_MUTATIONS: WeatherMutation[] = ['银', '金', '水晶', '流光'] // 品质（互斥）
const COMMON_MUTATIONS: WeatherMutation[] = ['潮湿', '生机', '覆雪', '迷雾', '颤栗', '落雷', '冰冻', '极光', '瓷化', '亮晶晶'] // 常见突变
const RARE_MUTATIONS: WeatherMutation[] = ['血月', '彩虹', '荧光', '星环', '霓虹'] // 罕见突变
const PAST_MUTATIONS: WeatherMutation[] = ['幽魂', '惊魂夜'] // 往期突变
const INTERMEDIATE_MUTATIONS: WeatherMutation[] = ['沙尘', '灼热', '结霜', '陶化'] // 中间状态突变

// 合成规则：当同时存在这些突变时，会合成成目标突变
const COMBINATION_RULES: Array<{
  ingredients: WeatherMutation[] // 需要的突变组合
  result: WeatherMutation // 合成结果
}> = [
  { ingredients: ['沙尘', '潮湿'], result: '陶化' },
  { ingredients: ['陶化', '灼热'], result: '瓷化' },
  { ingredients: ['潮湿', '结霜'], result: '冰冻' },
]

export const PriceCalculator = ({ crop, onBack }: PriceCalculatorProps) => {
  const [weight, setWeight] = useState<string>('')
  const [percentage, setPercentage] = useState<string>('')
  const [selectedMutations, setSelectedMutations] = useState<WeatherMutation[]>([])

  // 当作物切换时，清空重量和突变，默认选中常见突变
  useEffect(() => {
    setWeight('')
    setPercentage('')
    setSelectedMutations(COMMON_MUTATIONS)
  }, [crop?.name])

  if (!crop) {
    return (
      <div className="price-calculator empty">
        <p>请先选择作物</p>
      </div>
    )
  }

  // 处理重量输入变化
  const handleWeightChange = (value: string) => {
    if (value === '') {
      setWeight('')
      setPercentage('')
      return
    }
    
    const weightNum = parseFloat(value) || 0
    // 限制不超过最大重量
    const clampedWeight = Math.min(Math.max(weightNum, 0), crop.maxWeight)
    setWeight(clampedWeight.toString())
    
    if (clampedWeight > 0) {
      // 转换为百分比，不超过100%
      const calculatedPercentage = (clampedWeight / crop.maxWeight) * 100
      setPercentage(Math.round(calculatedPercentage).toString())
    } else {
      setPercentage('')
    }
  }

  // 处理百分比输入变化
  const handlePercentageChange = (value: string) => {
    if (value === '') {
      setPercentage('')
      setWeight('')
      return
    }
    
    const percentageNum = parseFloat(value) || 0
    // 限制在1-100之间
    const clampedPercentage = Math.min(Math.max(percentageNum, 1), 100)
    setPercentage(clampedPercentage.toString())
    
    // 转换为重量，不超过最大重量
    const calculatedWeight = (clampedPercentage / 100) * crop.maxWeight
    setWeight(calculatedWeight.toFixed(2))
  }

  const weightNum = parseFloat(weight) || 0
  const isValidWeight = weightNum > 0 && weightNum <= crop.maxWeight

  // 只要有重量就可以计算，不一定要有突变
  const result = isValidWeight
    ? calculatePrice(crop, weightNum, selectedMutations)
    : null
  
  // 格式化价格显示，如果没有结果则显示0
  const displayPrice = result ? result.formattedPrice : '0'

  // 处理品质突变（互斥，只能选一个）
  const toggleQualityMutation = (mutationName: WeatherMutation) => {
    setSelectedMutations(prev => {
      if (prev.includes(mutationName)) {
        // 取消选择
        return prev.filter(m => m !== mutationName)
      } else {
        // 选择新的，先移除其他品质突变
        const otherQualities = QUALITY_MUTATIONS.filter(m => m !== mutationName)
        const filtered = prev.filter(m => !otherQualities.includes(m))
        return [...filtered, mutationName]
      }
    })
  }

  // 递归获取所有间接合成条件（包括子流程）
  const getAllIngredients = (result: WeatherMutation, visited: Set<WeatherMutation> = new Set()): WeatherMutation[] => {
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

  // 检查某个突变是否因为合成结果存在而被禁用
  // 规则：如果合成结果已存在，除了潮湿以外的所有合成条件（包括间接的）都禁用
  const isMutationDisabled = (mutationName: WeatherMutation): boolean => {
    // 潮湿比较特殊，即使合成完了也能单独出现，所以不禁用
    if (mutationName === '潮湿') {
      return false
    }
    
    // 检查所有合成结果，看这个突变是否是它们的合成条件（包括间接的）
    for (const rule of COMBINATION_RULES) {
      if (selectedMutations.includes(rule.result)) {
        // 获取所有合成条件（包括间接的）
        const allIngredients = getAllIngredients(rule.result)
        if (allIngredients.includes(mutationName)) {
          return true
        }
      }
    }
    return false
  }

  // 检查并应用合成规则
  const applyCombinations = (mutations: WeatherMutation[]): WeatherMutation[] => {
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

  // 处理普通突变选择（只使用合成规则）
  const toggleMutation = (mutationName: WeatherMutation) => {
    // 如果突变被禁用（因为合成结果已存在），直接返回
    if (isMutationDisabled(mutationName)) {
      return
    }

    setSelectedMutations(prev => {
      if (prev.includes(mutationName)) {
        // 取消选择
        return prev.filter(m => m !== mutationName)
      } else {
        // 选择新的突变，直接添加后应用合成规则
        const newMutations = [...prev, mutationName]
        return applyCombinations(newMutations)
      }
    })
  }

  // 获取组的选择状态
  const getGroupState = (mutations: WeatherMutation[]): 'none' | 'all' | 'indeterminate' => {
    const selectedCount = mutations.filter(m => selectedMutations.includes(m)).length
    if (selectedCount === 0) return 'none'
    if (selectedCount === mutations.length) return 'all'
    return 'indeterminate'
  }

  // 处理组 checkbox 点击（全选或清空）
  const handleGroupToggle = (mutations: WeatherMutation[], isExclusive: boolean = false) => {
    const state = getGroupState(mutations)
    
    if (state === 'all') {
      // 全选状态，点击后清空
      setSelectedMutations(prev => prev.filter(m => !mutations.includes(m)))
    } else {
      // 部分选中或全不选，点击后全选
      if (isExclusive) {
        // 品质突变互斥，只选第一个
        setSelectedMutations(prev => {
          const otherQualities = QUALITY_MUTATIONS.filter(m => m !== mutations[0])
          const filtered = prev.filter(m => !otherQualities.includes(m))
          return [...filtered, mutations[0]]
        })
      } else {
        // 普通突变，全选（只考虑合成规则）
        setSelectedMutations(prev => {
          let newMutations = [...prev]
          mutations.forEach(mutationName => {
            // 跳过被禁用的突变
            if (!newMutations.includes(mutationName) && !isMutationDisabled(mutationName)) {
              newMutations.push(mutationName)
            }
          })
          // 应用合成规则
          return applyCombinations(newMutations)
        })
      }
    }
  }

  // 渲染突变组
  const renderMutationGroup = (title: string, mutations: WeatherMutation[], isExclusive: boolean = false, showCheckbox: boolean = true) => {
    const groupState = getGroupState(mutations)
    
    return (
      <div className="mutation-group">
        <div className="mutation-group-header">
          {showCheckbox ? (
            <label className="mutation-group-checkbox-label">
              <input
                type="checkbox"
                className="mutation-group-checkbox"
                checked={groupState === 'all'}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = groupState === 'indeterminate'
                  }
                }}
                onChange={() => handleGroupToggle(mutations, isExclusive)}
              />
              <span className="mutation-group-label">{title}</span>
            </label>
          ) : (
            <span className="mutation-group-label">{title}</span>
          )}
        </div>
        <div className="mutations-list">
          {mutations.map(mutationName => {
            const mutation = weatherMutations.find(m => m.name === mutationName)
            if (!mutation) return null
            
            const isSelected = selectedMutations.includes(mutationName)
            const isDisabled = isMutationDisabled(mutationName)
            const colorConfig = mutationColorConfig[mutation.color]
            
            return (
              <button
                key={mutationName}
                type="button"
                className={`mutation-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                style={{
                  background: colorConfig.gradient || colorConfig.bgColor,
                  opacity: isDisabled ? 0.4 : 1,
                }}
                disabled={isDisabled}
                onClick={() => isExclusive ? toggleQualityMutation(mutationName) : toggleMutation(mutationName)}
              >
                <span className="mutation-name">{mutationName}</span>
                {isSelected && (
                  <span className="mutation-checkmark">✓</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="price-calculator">
      <div className="calculator-header">
        {onBack && (
          <span className="back-link" onClick={onBack}>
            &lt; 返回
          </span>
        )}
        <h3 className="calculator-title">{crop.name}</h3>
      </div>

      <div className="calculator-inputs">
        <div className="input-group">
          <div className="input-group-row">
            <label className="input-label">重量 (kg)</label>
            <input
              type="number"
              className="input-field"
              value={weight}
              onChange={(e) => handleWeightChange(e.target.value)}
              placeholder={`最大: ${crop.maxWeight}`}
              min="0"
              max={crop.maxWeight}
              step="0.01"
            />
          </div>
          {weightNum > crop.maxWeight && (
            <span className="input-error">重量不能超过 {crop.maxWeight}kg</span>
          )}
        </div>

        <div className="input-group">
          <div className="input-group-row">
            <label className="input-label">百分比 (%)</label>
            <input
              type="number"
              className="input-field"
              value={percentage}
              onChange={(e) => handlePercentageChange(e.target.value)}
              placeholder="范围: 1-100%"
              min="1"
              max="100"
              step="1"
            />
          </div>
        </div>

        {/* 品质突变（互斥，不显示checkbox） */}
        {renderMutationGroup('品质', QUALITY_MUTATIONS, true, false)}
        
        {/* 常见突变 */}
        {renderMutationGroup('常见突变', COMMON_MUTATIONS)}
        
        {/* 中间状态突变（不显示checkbox） */}
        {renderMutationGroup('中间状态突变', INTERMEDIATE_MUTATIONS, false, false)}
        
        {/* 罕见突变 */}
        {renderMutationGroup('罕见突变', RARE_MUTATIONS)}
        
        {/* 往期突变 */}
        {renderMutationGroup('往期突变', PAST_MUTATIONS)}
      </div>

      {/* 固定底部的价格展示区域 */}
      <div className="calculator-result-fixed">
        <span className="result-label">最终价格</span>
        <span className="result-value-large">{displayPrice}</span>
      </div>
    </div>
  )
}
