import { useState, useEffect, useRef } from 'react'
import type { WeatherMutation, HistoryRecord, CalculationResult } from '@/types'
import { calculatePrice, parseFormattedPrice, convertToYuan, calculateWeightFromPrice } from '@/utils/priceCalculator'
import { parseShareUrl } from '@/utils/shareEncoder'
import { crops } from '@/data/crops'
import { PriceFeedback } from '@/components/PriceFeedback'
import { addHistoryRecord } from '@/utils/historyStorage'
import { useAnimatedPrice } from './hooks'
import { CalculatorHeader } from './CalculatorHeader'
import { WeightInputGroup } from './WeightInputGroup'
import { MutationGroups } from './MutationGroups'
import { ResultArea } from './ResultArea'
import { ShareModal } from './ShareModal'
import { Toast } from './Toast'
import type { PriceCalculatorProps, CalculationMode } from './types'
import './PriceCalculator.css'

/**
 * 价格计算器组件
 * 
 * 功能：
 * 1. 支持按重量计算价格
 * 2. 支持按价格反推重量
 * 3. 突变选择和合成规则处理
 * 4. 分享计算结果
 * 5. 保存到历史记录
 */
export const PriceCalculator = ({ crop, onBack, prefillData, favoriteCropNames = [], onToggleFavorite }: PriceCalculatorProps) => {
  // ========== 状态管理 ==========
  // 输入相关
  const [weight, setWeight] = useState<string>('')
  const [percentage, setPercentage] = useState<string>('')
  /** 生长速度：生长 1% 需要多少秒（秒/%），用户实测填或由重量自动算出 */
  const [growthSpeed, setGrowthSpeed] = useState<string>('')
  const [selectedMutations, setSelectedMutations] = useState<WeatherMutation[]>([])
  
  // 计算模式相关
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('weight')
  const [priceInput, setPriceInput] = useState<string>('')
  const [isEditingPrice, setIsEditingPrice] = useState(false)
  
  // UI 状态
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  
  // 数据恢复状态
  const [hasRestoredFromUrl, setHasRestoredFromUrl] = useState(false)

  // 本次进入计算页面的唯一会话 ID（锁）
  const sessionIdRef = useRef<string | null>(null)


  // ========== 副作用处理 ==========
  
  /**
   * 当从「未选作物」进入到「有作物」状态时，生成新的会话 ID
   * 等价于「每次真正打开计算器页面时，换一把新的锁」
   */
  useEffect(() => {
    if (!crop) return
    sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }, [crop?.name])

  /**
   * 从URL参数恢复配置（仅在首次加载时）
   * 用于处理分享链接的回填
   */
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

  /**
   * 当作物变为 null 时，重置所有状态
   * 用于处理组件卸载或返回选择页面时的清理
   */
  useEffect(() => {
    if (!crop) {
      setWeight('')
      setPercentage('')
      setGrowthSpeed('')
      setSelectedMutations([])
      setPriceInput('')
      setIsEditingPrice(false)
      setCalculationMode('weight')
      setHasRestoredFromUrl(false)
      return
    }
  }, [crop])

  /**
   * 当作物切换时，清空重量和突变
   * 如果已经从URL恢复过配置，则不再重置
   */
  useEffect(() => {
    // 如果已经从URL恢复过配置，不再重置
    if (hasRestoredFromUrl) return
    
    // 如果URL中没有分享参数，才重置
    const shareData = parseShareUrl()
    if (!shareData || crops[shareData.cropIndex]?.name !== crop?.name) {
      setWeight('')
      setPercentage('')
      setGrowthSpeed('')
      setSelectedMutations([])
      // 重置价格相关状态
      setPriceInput('')
      setIsEditingPrice(false)
      setCalculationMode('weight')
    }
  }, [crop?.name, hasRestoredFromUrl])

  /**
   * 从历史记录回填数据
   * 当用户从历史记录选择一条记录时，自动填充到计算器
   */
  useEffect(() => {
    if (!crop || !prefillData) {
      // 如果没有 prefillData，重置 hasRestoredFromUrl 和价格相关状态
      if (!prefillData) {
        setHasRestoredFromUrl(false)
        setPriceInput('')
        setIsEditingPrice(false)
        setCalculationMode('weight')
      }
      return
    }

    // 只有当作物匹配时才回填
    const formattedWeight = Number(prefillData.weight).toFixed(2).replace(/\.?0+$/, '')
    setWeight(formattedWeight)
    // 根据重量计算百分比
    const weightNum = Number(prefillData.weight)
    if (weightNum > 0 && crop) {
      const percentageNum = getPercentageFromWeight(weightNum, crop.maxWeight)
      setPercentage(percentageNum ? percentageNum.toString() : '')
      // 生长速度 = 生长耗时的 1%（秒）
      const secPerPercent = 0.01 * weightNum * crop.growthSpeed
      setGrowthSpeed(secPerPercent > 0 ? secPerPercent.toFixed(2).replace(/\.?0+$/, '') : '')
    } else {
      setPercentage('')
      setGrowthSpeed('')
    }
    setSelectedMutations(prefillData.mutations.length ? prefillData.mutations : [])
    setHasRestoredFromUrl(true)
    // 重置价格相关状态
    setPriceInput('')
    setIsEditingPrice(false)
    setCalculationMode('weight')
  }, [prefillData, crop?.name])

  // ========== 事件处理函数 ==========
  
  // ========== 价格计算逻辑 ==========
  // 注意：必须在所有 hooks 之后，条件返回之前
  
  const weightNum = parseFloat(weight) || 0
  // 最小重量 = 最大重量 / 34（仅用于输入控件的提示和限制）
  const minWeight = crop ? crop.maxWeight / 34 : 0
  // 价格计算的有效范围：> 0 且 <= 最大重量
  // 实际输入下限已经由 InputNumber 的 minWeight 控制，这里不再重复校验，以避免边界浮点误差导致 0 价格
  const isValidWeight = crop ? (weightNum > 0 && weightNum <= crop.maxWeight) : false

  /**
   * 根据重量计算百分比（向下取整，但最低为 3%，用于展示）
   * - 0 或超出范围返回 0
   * - (0, 3) 之间的有效值统一显示为 3%
   */
  const getPercentageFromWeight = (w: number, maxW: number): number => {
    if (maxW <= 0 || w <= 0 || w > maxW) return 0
    const raw = (w / maxW) * 100
    const floored = Math.floor(raw)
    if (floored > 0 && floored < 3) return 3
    return floored
  }
  
  /**
   * 根据计算模式计算价格或反推重量
   * - weight 模式：按重量计算价格
   * - price 模式：按价格反推重量
   */
  let result: CalculationResult | null = null
  
  if (calculationMode === 'weight' && isValidWeight && crop) {
    // 按重量计算价格
    result = calculatePrice(crop, weightNum, selectedMutations)
  } else if (calculationMode === 'price' && crop && priceInput.trim()) {
    // 按价格反推重量
    try {
      const parsed = parseFormattedPrice(priceInput.trim())
      const priceInYuan = convertToYuan(parsed.value, parsed.unit)
      if (priceInYuan > 0 && !isNaN(priceInYuan) && isFinite(priceInYuan)) {
        const calculatedWeight = calculateWeightFromPrice(crop, priceInYuan, selectedMutations)
        // 限制在最小重量和最大重量之间
        const minWeight = crop.maxWeight / 34
        if (calculatedWeight !== null && calculatedWeight >= minWeight && calculatedWeight <= crop.maxWeight) {
          // 反推成功，计算价格用于显示（应该和输入的价格一致或接近）
          result = calculatePrice(crop, calculatedWeight, selectedMutations)
        }
      }
    } catch (e) {
      // 解析失败，不进行计算
    }
  }
  
  const targetPrice = result ? result.formattedPrice : '0'
  // 使用动画价格 hook（必须在条件返回之前调用）
  const displayPrice = useAnimatedPrice(targetPrice)

  /**
   * 自动保存当前计算结果到历史记录
   * - 有有效结果时自动触发
   * - 使用 sessionId 将本次进入页面的所有操作归为一条记录（锁的概念）
   */
  useEffect(() => {
    if (!crop || !isValidWeight || !result) return

    const record: HistoryRecord = {
      id: Date.now().toString(),
      cropName: crop.name,
      weight: weightNum,
      mutations: [...selectedMutations],
      price: result.formattedPrice,
      timestamp: Date.now(),
      sessionId: sessionIdRef.current || undefined,
    }

    addHistoryRecord(record)
  }, [crop, isValidWeight, result, weightNum, selectedMutations])
  
  /**
   * 如果反推了重量，更新重量显示
   * 当价格输入变化或突变变化时，重新反推重量
   */
  useEffect(() => {
    if (calculationMode === 'price' && crop && priceInput.trim()) {
      try {
        const parsed = parseFormattedPrice(priceInput.trim())
        const priceInYuan = convertToYuan(parsed.value, parsed.unit)
        if (priceInYuan > 0 && !isNaN(priceInYuan) && isFinite(priceInYuan)) {
          const calculatedWeight = calculateWeightFromPrice(crop, priceInYuan, selectedMutations)
          // 限制在最小重量和最大重量之间
          const minWeight = crop.maxWeight / 34
          if (calculatedWeight !== null && calculatedWeight >= minWeight && calculatedWeight <= crop.maxWeight) {
            const formattedWeight = calculatedWeight.toFixed(2).replace(/\.?0+$/, '')
            setWeight(formattedWeight)
            // 根据重量计算百分比（最低为 3%）
            const percentageNum = getPercentageFromWeight(calculatedWeight, crop.maxWeight)
            setPercentage(percentageNum ? percentageNum.toString() : '')
          }
        }
      } catch (e) {
        // 解析失败，不更新重量
      }
    }
  }, [priceInput, calculationMode, crop, selectedMutations])

  /**
   * 处理重量输入变化
   * - 自动切换到重量计算模式
   * - InputNumber 会自动处理范围限制
   * - 自动计算百分比
   */
  const handleWeightChange = (value: number | null) => {
    // 切换到重量计算模式
    if (calculationMode !== 'weight') {
      setCalculationMode('weight')
      setIsEditingPrice(false)
      setPriceInput('')
    }
    
    if (value === null || value === undefined) {
      setWeight('')
      setPercentage('')
      setGrowthSpeed('')
      return
    }
    
    // InputNumber 已经处理了范围限制，直接使用值
    setWeight(value.toString())
    
    // 计算百分比
    if (!crop) return
    if (value > 0 && value <= crop.maxWeight) {
      const percentageNum = getPercentageFromWeight(value, crop.maxWeight)
      setPercentage(percentageNum ? percentageNum.toString() : '')
      // 生长速度 = 生长耗时的 1%（秒），生长耗时 = value * crop.growthSpeed
      const secPerPercent = 0.01 * value * crop.growthSpeed
      setGrowthSpeed(secPerPercent > 0 ? secPerPercent.toFixed(2).replace(/\.?0+$/, '') : '')
    } else {
      setPercentage('')
      setGrowthSpeed('')
    }
  }

  /**
   * 处理生长速度输入变化（生长耗时的 1%，单位秒，用户可实测填写）
   * 先填生长速度时：反推重量 = 生长速度×100 / crop.growthSpeed，并更新百分比
   */
  const handleGrowthSpeedChange = (value: number | null) => {
    const str = value === null || value === undefined ? '' : value.toString()
    setGrowthSpeed(str)
    if (!crop || crop.growthSpeed <= 0) return
    const speedNum = value === null || value === undefined ? 0 : Number(value)
    if (speedNum <= 0) return
    // 生长速度 = 生长耗时×1% = 0.01×重量×crop.growthSpeed => 重量 = 生长速度×100 / crop.growthSpeed
    const minW = crop.maxWeight / 34
    const calculatedWeight = (speedNum * 100) / crop.growthSpeed
    const clampedWeight = Math.min(Math.max(calculatedWeight, minW), crop.maxWeight)
    setWeight(clampedWeight.toFixed(2).replace(/\.?0+$/, ''))
    const percentageNum = getPercentageFromWeight(clampedWeight, crop.maxWeight)
    setPercentage(percentageNum ? percentageNum.toString() : '')
  }

  /**
   * 生长速度失焦时：若超出有效范围则自动修正为边界值，并同步重量、百分比
   * 有效范围：生长速度 = 生长耗时的 1%，对应重量 [minWeight, maxWeight]
   */
  const handleGrowthSpeedBlur = () => {
    if (!crop || crop.growthSpeed <= 0) return
    const speedNum = parseFloat(growthSpeed)
    if (Number.isNaN(speedNum) || speedNum <= 0) return
    const minW = crop.maxWeight / 34
    const minSpeed = 0.01 * minW * crop.growthSpeed
    const maxSpeed = 0.01 * crop.maxWeight * crop.growthSpeed
    if (speedNum < minSpeed) {
      setGrowthSpeed(minSpeed.toFixed(2).replace(/\.?0+$/, ''))
      setWeight(minW.toFixed(2).replace(/\.?0+$/, ''))
      const percentageNum = getPercentageFromWeight(minW, crop.maxWeight)
      setPercentage(percentageNum ? percentageNum.toString() : '')
    } else if (speedNum > maxSpeed) {
      setGrowthSpeed(maxSpeed.toFixed(2).replace(/\.?0+$/, ''))
      setWeight(crop.maxWeight.toFixed(2).replace(/\.?0+$/, ''))
      setPercentage('100')
    }
  }

  /**
   * 处理价格输入变化
   * - 自动切换到价格反推模式
   */
  const handlePriceChange = (value: string) => {
    // 切换到价格反推模式
    if (calculationMode !== 'price') {
      setCalculationMode('price')
    }
    
    setPriceInput(value)
  }

  /**
   * 处理价格输入框点击，进入编辑模式
   * - 切换到价格反推模式
   * - 如果当前有显示价格，预填充到输入框
   */
  const handlePriceClick = () => {
    setCalculationMode('price')
    setIsEditingPrice(true)
    if (!priceInput && displayPrice !== '0') {
      setPriceInput(displayPrice)
    }
  }

  /**
   * 处理价格输入框失焦，退出编辑模式
   * - 切换回重量计算模式
   * - 清空价格输入
   */
  const handlePriceBlur = () => {
    setIsEditingPrice(false)
    // 失去焦点时，切换回重量计算模式，并清空价格输入
    setCalculationMode('weight')
    setPriceInput('')
  }

  /**
   * 处理百分比输入变化
   * - 自动切换到重量计算模式
   * - InputNumber 会自动处理范围限制
   * - 自动转换为重量
   */
  const handlePercentageChange = (value: number | null) => {
    if (!crop) return
    
    // 切换到重量计算模式
    if (calculationMode !== 'weight') {
      setCalculationMode('weight')
      setIsEditingPrice(false)
      setPriceInput('')
    }
    
    if (value === null || value === undefined) {
      setPercentage('')
      setWeight('')
      setGrowthSpeed('')
      return
    }
    
    // InputNumber 已经处理了范围限制，直接使用值
    setPercentage(value.toString())
    
    // 转换为重量
    const minWeight = crop.maxWeight / 34
    const calculatedWeight = (value / 100) * crop.maxWeight
    const clampedWeight = Math.min(Math.max(calculatedWeight, minWeight), crop.maxWeight)
    setWeight(clampedWeight.toFixed(2).replace(/\.?0+$/, ''))
    // 生长速度 = 生长耗时的 1%（秒）
    const secPerPercent = 0.01 * clampedWeight * crop.growthSpeed
    setGrowthSpeed(secPerPercent > 0 ? secPerPercent.toFixed(2).replace(/\.?0+$/, '') : '')
  }

  // ========== 事件处理辅助函数 ==========
  
  /**
   * 切换到重量模式（当输入框获得焦点时）
   */
  const handleInputFocus = () => {
    if (calculationMode === 'price') {
      setCalculationMode('weight')
      setIsEditingPrice(false)
      setPriceInput('')
    }
  }


  /**
   * 显示 Toast 提示
   */
  const showToastMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 2000)
  }

  // ========== UI 渲染 ==========
  
  if (!crop) {
    return null
  }
  
  // 此时 crop 一定不为 null，使用非空断言
  const safeCrop = crop
  
  return (
    <div className="price-calculator">
      <CalculatorHeader
        crop={safeCrop}
        onBack={onBack}
        weight={weight}
        percentage={percentage}
        selectedMutations={selectedMutations}
        onShareClick={(url) => {
          setShareUrl(url)
          setShowShareModal(true)
        }}
        onError={showToastMessage}
        isFavorite={favoriteCropNames.includes(safeCrop.name)}
        onFavoriteClick={
          onToggleFavorite
            ? () => {
                onToggleFavorite(safeCrop.name, (success, isNowFavorite) => {
                  if (success) {
                    showToastMessage(isNowFavorite ? '已收藏' : '已取消收藏')
                  } else {
                    showToastMessage('操作失败，请重试')
                  }
                })
              }
            : undefined
        }
      />

      <div className="calculator-inputs">
        <WeightInputGroup
          crop={safeCrop}
          weight={weight}
          percentage={percentage}
          growthSpeed={growthSpeed}
          calculationMode={calculationMode}
          minWeight={minWeight}
          minPercentage={Math.ceil((minWeight / safeCrop.maxWeight) * 100)}
          onWeightChange={handleWeightChange}
          onPercentageChange={handlePercentageChange}
          onGrowthSpeedChange={handleGrowthSpeedChange}
          onGrowthSpeedBlur={handleGrowthSpeedBlur}
          onFocus={handleInputFocus}
        />

        <MutationGroups
          crop={safeCrop}
          selectedMutations={selectedMutations}
          onMutationsChange={setSelectedMutations}
        />
      </div>

      <ResultArea
        calculationMode={calculationMode}
        displayPrice={displayPrice}
        priceInput={priceInput}
        isEditingPrice={isEditingPrice}
        isValidWeight={isValidWeight}
        onPriceClick={handlePriceClick}
        onPriceChange={handlePriceChange}
        onPriceBlur={handlePriceBlur}
        onFeedback={() => {
          if (isValidWeight && result) {
            setShowFeedbackModal(true)
          } else {
            showToastMessage('请先输入重量并选择突变')
          }
        }}
      />

      {showToast && <Toast message={toastMessage || '已复制到剪贴板'} />}

      <ShareModal
        isOpen={showShareModal}
        shareUrl={shareUrl}
        crop={safeCrop}
        selectedMutations={selectedMutations}
        onClose={() => setShowShareModal(false)}
        onCopy={showToastMessage}
      />

      {isValidWeight && result && (
        <PriceFeedback
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          crop={safeCrop}
          weight={weightNum}
          mutations={selectedMutations}
          calculatedPrice={result.price}
          formattedPrice={result.formattedPrice}
        />
      )}
    </div>
  )
}
