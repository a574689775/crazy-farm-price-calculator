import { useState, useEffect, useRef } from 'react'
import { LeftOutlined, ShareAltOutlined } from '@ant-design/icons'
import type { CropConfig, WeatherMutation } from '@/types'
import { weatherMutations, mutationColorConfig } from '@/data/weatherMutations'
import { calculatePrice, formatPrice, parseFormattedPrice, convertToYuan } from '@/utils/priceCalculator'
import { generateShareUrl, parseShareUrl } from '@/utils/shareEncoder'
import { crops } from '@/data/crops'
import { Modal } from '@/components/Modal'
import { PriceFeedback } from '@/components/PriceFeedback'
import { SVGText } from '@/components/SVGText'
import './PriceCalculator.css'

interface PriceCalculatorProps {
  crop: CropConfig | null
  onBack?: () => void
}

// 突变分组（品质从高到低排序）
const QUALITY_MUTATIONS: WeatherMutation[] = ['流光', '水晶', '金', '银'] // 品质（互斥）
const COMMON_MUTATIONS: WeatherMutation[] = ['瓷化', '亮晶晶', '落雷', '冰冻', '颤栗', '覆雪', '潮湿', '迷雾', '生机'] // 常见突变
const RARE_MUTATIONS: WeatherMutation[] = ['霓虹', '星环', '血月', '彩虹', '荧光'] // 罕见突变
const PAST_MUTATIONS: WeatherMutation[] = ['极光', '幽魂', '惊魂夜'] // 往期突变
const INTERMEDIATE_MUTATIONS: WeatherMutation[] = ['陶化', '沙尘', '灼热', '结霜'] // 中间状态突变
const SPECIAL_MUTATIONS: WeatherMutation[] = ['薯片', '方形', '糖葫芦', '连体', '黄瓜蛇', '万圣夜', '香蕉猴', '笑日葵'] // 异形突变

// 合成规则：当同时存在这些突变时，会合成成目标突变
const COMBINATION_RULES: Array<{
  ingredients: WeatherMutation[] // 需要的突变组合
  result: WeatherMutation // 合成结果
}> = [
  { ingredients: ['沙尘', '潮湿'], result: '陶化' },
  { ingredients: ['陶化', '灼热'], result: '瓷化' },
  { ingredients: ['潮湿', '结霜'], result: '冰冻' },
]

// 数字滚动动画 hook
const useAnimatedPrice = (targetPrice: string) => {
  const [displayPrice, setDisplayPrice] = useState(targetPrice)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const startValueRef = useRef<number>(0)
  const targetValueRef = useRef<number>(0)
  const startUnitRef = useRef<'元' | '万' | '亿'>('元')
  const targetUnitRef = useRef<'元' | '万' | '亿'>('元')

  useEffect(() => {
    if (targetPrice === displayPrice) return // 如果目标价格和当前显示价格相同，不需要动画

    // 解析目标价格
    const targetParsed = parseFormattedPrice(targetPrice)
    const targetValue = convertToYuan(targetParsed.value, targetParsed.unit)
    
    // 解析当前显示价格
    const currentParsed = parseFormattedPrice(displayPrice)
    const currentValue = convertToYuan(currentParsed.value, currentParsed.unit)

    // 如果数值相同，直接更新显示（可能是单位变化）
    if (Math.abs(targetValue - currentValue) < 0.01) {
      setDisplayPrice(targetPrice)
      return
    }

    // 设置起始值和目标值
    startValueRef.current = currentValue
    targetValueRef.current = targetValue
    startUnitRef.current = currentParsed.unit
    targetUnitRef.current = targetParsed.unit

    // 清除之前的动画
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // 动画持续时间（毫秒）
    const duration = 200
    startTimeRef.current = Date.now()

    const animate = () => {
      const now = Date.now()
      const elapsed = now - (startTimeRef.current || now)
      const progress = Math.min(elapsed / duration, 1)

      // 使用缓动函数（ease-out）
      const easeOut = 1 - Math.pow(1 - progress, 3)

      // 计算当前值
      const currentValue = startValueRef.current + (targetValueRef.current - startValueRef.current) * easeOut

      // 格式化并更新显示
      const formatted = formatPrice(currentValue)
      setDisplayPrice(formatted)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // 动画完成，确保显示目标值
        setDisplayPrice(targetPrice)
        animationRef.current = null
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetPrice])

  return displayPrice
}

export const PriceCalculator = ({ crop, onBack }: PriceCalculatorProps) => {
  const [weight, setWeight] = useState<string>('')
  const [percentage, setPercentage] = useState<string>('')
  const [selectedMutations, setSelectedMutations] = useState<WeatherMutation[]>(COMMON_MUTATIONS)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>('')
  const [hasRestoredFromUrl, setHasRestoredFromUrl] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  // 获取当前选中的品质突变（银、金、水晶、流光）
  const getSelectedQuality = (): string => {
    const quality = selectedMutations.find(m => QUALITY_MUTATIONS.includes(m))
    return quality || '普通'
  }

  // 获取当前选中的异形突变
  const getSelectedSpecial = (): string | null => {
    const special = selectedMutations.find(m => SPECIAL_MUTATIONS.includes(m))
    return special || null
  }

  // 分享文案模版（有异形突变）
  const shareTemplatesWithSpecial = [
    (quality: string, special: string) => `我的${quality}${special}居然这么值钱？`,
    (quality: string, special: string) => `没想到${quality}${special}能卖这个价！`,
    (quality: string, special: string) => `${quality}${special}的价格也太夸张了吧`,
    (quality: string, special: string) => `我的${quality}${special}竟然值这么多？`,
    (quality: string, special: string) => `${quality}${special}这个价格你敢信？`,
    (quality: string, special: string) => `看看我的${quality}${special}值多少钱`,
  ]

  // 分享文案模版（无异形突变）
  const shareTemplatesWithoutSpecial = [
    (quality: string, cropName: string) => `我的${quality}${cropName}居然这么值钱？`,
    (quality: string, cropName: string) => `没想到${quality}${cropName}能卖这个价！`,
    (quality: string, cropName: string) => `${quality}${cropName}的价格也太夸张了吧`,
    (quality: string, cropName: string) => `我的${quality}${cropName}竟然值这么多？`,
    (quality: string, cropName: string) => `${quality}${cropName}这个价格你敢信？`,
    (quality: string, cropName: string) => `看看我的${quality}${cropName}值多少钱`,
  ]

  // 从URL参数恢复配置（仅在首次加载时）
  useEffect(() => {
    if (hasRestoredFromUrl || !crop) return
    
    const shareData = parseShareUrl()
    if (shareData && shareData.cropIndex < crops.length) {
      const sharedCrop = crops[shareData.cropIndex]
      // 如果当前作物与分享的作物匹配，恢复配置
      if (crop.name === sharedCrop.name) {
        setWeight(shareData.weight.toFixed(2))
        setPercentage(shareData.percentage.toString())
        setSelectedMutations(shareData.mutations)
        setHasRestoredFromUrl(true)
      }
    }
  }, [crop, hasRestoredFromUrl])

  // 当作物切换时，清空重量和突变，默认选中常见突变
  useEffect(() => {
    // 如果已经从URL恢复过配置，不再重置
    if (hasRestoredFromUrl) return
    
    // 如果URL中没有分享参数，才重置
    const shareData = parseShareUrl()
    if (!shareData || crops[shareData.cropIndex]?.name !== crop?.name) {
      setWeight('')
      setPercentage('')
      setSelectedMutations(COMMON_MUTATIONS)
    }
  }, [crop?.name, hasRestoredFromUrl])

  // 计算价格（必须在所有 hooks 之后，条件返回之前）
  const weightNum = parseFloat(weight) || 0
  const isValidWeight = crop ? (weightNum > 0 && weightNum <= crop.maxWeight) : false
  const result = isValidWeight && crop
    ? calculatePrice(crop, weightNum, selectedMutations)
    : null
  const targetPrice = result ? result.formattedPrice : '0'
  // 使用动画价格 hook（必须在条件返回之前调用）
  const displayPrice = useAnimatedPrice(targetPrice)

  if (!crop) {
    return null
  }

  // 处理重量输入变化
  const handleWeightChange = (value: string) => {
    if (value === '') {
      setWeight('')
      setPercentage('')
      return
    }
    
    // 允许输入小数点和小数，保留用户输入的原始格式
    // 只验证是否为有效数字格式
    const isValidNumber = /^-?\d*\.?\d*$/.test(value)
    if (!isValidNumber) {
      return // 如果不是有效数字格式，不更新
    }
    
    const weightNum = parseFloat(value) || 0
    // 限制不超过最大重量
    const clampedWeight = Math.min(Math.max(weightNum, 0), crop.maxWeight)
    
    // 如果输入以小数点结尾（如"2."），保留原始格式
    // 如果输入是有效数字，使用计算后的值，但保留小数部分
    if (value.endsWith('.') || value.endsWith('.0') || value.endsWith('.00')) {
      // 保留用户输入的格式
      setWeight(value)
    } else if (weightNum === clampedWeight) {
      // 如果值没有超出范围，保留用户输入的格式（包括小数位）
      setWeight(value)
    } else {
      // 如果超出范围，使用限制后的值
      setWeight(clampedWeight.toString())
    }
    
    // 计算百分比时使用数值
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

  // 处理互斥突变（品质突变和异形突变，只能选一个）
  const toggleExclusiveMutation = (mutationName: WeatherMutation, exclusiveGroup: WeatherMutation[]) => {
    setSelectedMutations(prev => {
      if (prev.includes(mutationName)) {
        // 取消选择
        return prev.filter(m => m !== mutationName)
      } else {
        // 选择新的，先移除同组其他突变
        const otherMutations = exclusiveGroup.filter(m => m !== mutationName)
        const filtered = prev.filter(m => !otherMutations.includes(m))
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
              <div
                key={mutationName}
                className={`mutation-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                style={{
                  background: colorConfig.gradient || colorConfig.bgColor,
                  opacity: isDisabled ? 0.4 : 1,
                }}
                onClick={() => {
                  if (!isDisabled) {
                    isExclusive ? toggleExclusiveMutation(mutationName, mutations) : toggleMutation(mutationName)
                  }
                }}
              >
                <SVGText
                  fillColor="#fff"
                  strokeColor="#000"
                  strokeWidth={2}
                  fontSize={14}
                  fontWeight={900}
                  className="mutation-name"
                  style={{ width: '100%', height: '100%' }}
                >
                  {mutationName}
                </SVGText>
                <img 
                  className={`mutation-checkmark ${isSelected ? 'visible' : ''}`}
                  src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/对号.png" 
                  alt="选中"
                />
              </div>
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
            <LeftOutlined />
          </span>
        )}
        <h3 className="calculator-title">{crop.name}</h3>
        <button
          className="share-header-button"
          onClick={() => {
            if (isValidWeight && weightNum > 0) {
              const cropIndex = crops.findIndex(c => c.name === crop.name)
              if (cropIndex !== -1) {
                const percentageNum = parseFloat(percentage) || 0
                const url = generateShareUrl({
                  cropIndex,
                  weight: weightNum,
                  percentage: percentageNum || Math.round((weightNum / crop.maxWeight) * 100),
                  mutations: selectedMutations,
                })
                setShareUrl(url)
                setShowShareModal(true)
              }
            } else {
              setToastMessage('请先输入重量并选择突变')
              setShowToast(true)
              setTimeout(() => {
                setShowToast(false)
              }, 2000)
            }
          }}
          title="分享计算结果"
        >
          <ShareAltOutlined />
        </button>
      </div>

      <div className="calculator-inputs">
        <div className="input-group">
          <div className="input-group-row-with-image">
            <div className="input-fields-wrapper">
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
            <img 
              src={`https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/${crop.name}.png`}
              alt={crop.name}
              className="crop-image"
            />
          </div>
          {weightNum > crop.maxWeight && (
            <span className="input-error">重量不能超过 {crop.maxWeight}kg</span>
          )}
        </div>

        {/* 品质突变（互斥，不显示checkbox） */}
        {renderMutationGroup('品质', QUALITY_MUTATIONS, true, false)}
        
        {/* 异形突变（根据作物显示，不互斥） */}
        {crop.specialMutations && crop.specialMutations.length > 0 && (
          renderMutationGroup('异形突变', crop.specialMutations, false, false)
        )}
        
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
        <button
          className="feedback-button"
          onClick={() => {
            if (isValidWeight && result) {
              setShowFeedbackModal(true)
            } else {
              setToastMessage('请先输入重量并选择突变')
              setShowToast(true)
              setTimeout(() => {
                setShowToast(false)
              }, 2000)
            }
          }}
        >
          反馈
        </button>
        <div className="result-right">
          <span className="result-label">
            <SVGText
              fillColor="rgba(132, 49, 0, 1)"
              strokeColor="#fff"
              strokeWidth={4}
              fontSize={16}
              fontWeight={700}
              style={{ width: '100%', height: '100%' }}
            >
              价格:
            </SVGText>
          </span>
          <span className="result-value-large">
            <SVGText
              fillColor="rgba(132, 49, 0, 1)"
              strokeColor="#fff"
              strokeWidth={4}
              fontSize={24}
              fontWeight={700}
              style={{ width: '100%', height: '100%' }}
            >
              {displayPrice}
            </SVGText>
          </span>
        </div>
      </div>

      {/* Toast 提示 */}
      {showToast && (
        <div className="toast">
          <div className="toast-content">{toastMessage || '已复制到剪贴板'}</div>
        </div>
      )}

      {/* 分享弹窗 */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="分享计算结果"
      >
          <div className="share-url-container">
            <input
              type="text"
              className="share-url-input"
              value={shareUrl}
              readOnly
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              className="share-copy-button"
              onClick={() => {
                // 获取当前品质、异形突变和作物名
                const quality = getSelectedQuality()
                const special = getSelectedSpecial()
                const cropName = crop.name
                
                // 根据是否有异形突变选择不同的文案模版
                let shareText: string
                if (special) {
                  // 有异形突变：只显示品质+异形突变
                  const randomTemplate = shareTemplatesWithSpecial[Math.floor(Math.random() * shareTemplatesWithSpecial.length)]
                  shareText = randomTemplate(quality, special)
                } else {
                  // 无异形突变：品质+作物名
                  const randomTemplate = shareTemplatesWithoutSpecial[Math.floor(Math.random() * shareTemplatesWithoutSpecial.length)]
                  shareText = randomTemplate(quality, cropName)
                }
                
                const textToCopy = `${shareText} ${shareUrl}`
                
                navigator.clipboard.writeText(textToCopy).then(() => {
                  // 关闭弹窗
                  setShowShareModal(false)
                  // 显示提示
                  setToastMessage('已复制到剪贴板')
                  setShowToast(true)
                  // 2秒后自动隐藏提示
                  setTimeout(() => {
                    setShowToast(false)
                  }, 2000)
                })
              }}
            >
              点此复制链接
            </button>
          </div>
          <div className="share-info">
            <p>复制链接发送给好友</p>
          </div>
      </Modal>

      {/* 价格反馈弹窗 */}
      {isValidWeight && result && (
        <PriceFeedback
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          crop={crop}
          weight={weightNum}
          mutations={selectedMutations}
          calculatedPrice={result.price}
          formattedPrice={result.formattedPrice}
        />
      )}
    </div>
  )
}
