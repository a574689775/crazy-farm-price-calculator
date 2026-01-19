import { useState, useEffect } from 'react'
import type { WeatherMutation, HistoryRecord, CalculationResult } from '@/types'
import { calculatePrice, parseFormattedPrice, convertToYuan, calculateWeightFromPrice } from '@/utils/priceCalculator'
import { parseShareUrl } from '@/utils/shareEncoder'
import { crops } from '@/data/crops'
import { PriceFeedback } from '@/components/PriceFeedback'
import { addHistoryRecord } from '@/utils/historyStorage'
import { useAnimatedPrice } from './hooks'
import { COMMON_MUTATIONS } from './constants'
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
export const PriceCalculator = ({ crop, onBack, prefillData }: PriceCalculatorProps) => {
  // ========== 状态管理 ==========
  // 输入相关
  const [weight, setWeight] = useState<string>('')
  const [percentage, setPercentage] = useState<string>('')
  const [selectedMutations, setSelectedMutations] = useState<WeatherMutation[]>(COMMON_MUTATIONS)
  
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


  // ========== 副作用处理 ==========
  
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
      setSelectedMutations(COMMON_MUTATIONS)
      setPriceInput('')
      setIsEditingPrice(false)
      setCalculationMode('weight')
      setHasRestoredFromUrl(false)
      return
    }
  }, [crop])

  /**
   * 当作物切换时，清空重量和突变，默认选中常见突变
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
      setSelectedMutations(COMMON_MUTATIONS)
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
      const percentageNum = Math.round((weightNum / crop.maxWeight) * 100)
      setPercentage(percentageNum.toString())
    } else {
      setPercentage('')
    }
    setSelectedMutations(prefillData.mutations.length ? prefillData.mutations : COMMON_MUTATIONS)
    setHasRestoredFromUrl(true)
    // 重置价格相关状态
    setPriceInput('')
    setIsEditingPrice(false)
    setCalculationMode('weight')
  }, [prefillData, crop?.name])

  // ========== 事件处理函数 ==========
  
  /**
   * 保存当前计算结果到历史记录
   */
  const handleSaveToHistory = () => {
    if (!crop || !isValidWeight || !result) {
      setToastMessage('请先输入重量并选择突变')
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 2000)
      return
    }

    const record: HistoryRecord = {
      id: Date.now().toString(),
      cropName: crop.name,
      weight: weightNum,
      mutations: [...selectedMutations],
      price: displayPrice,
      timestamp: Date.now(),
    }

    addHistoryRecord(record)
    setToastMessage('已保存到历史记录')
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 2000)
  }

  // ========== 价格计算逻辑 ==========
  // 注意：必须在所有 hooks 之后，条件返回之前
  
  const weightNum = parseFloat(weight) || 0
  const isValidWeight = crop ? (weightNum > 0 && weightNum <= crop.maxWeight) : false
  
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
        if (calculatedWeight !== null && calculatedWeight >= 0) {
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
          if (calculatedWeight !== null && calculatedWeight >= 0) {
            const formattedWeight = calculatedWeight.toFixed(2).replace(/\.?0+$/, '')
            setWeight(formattedWeight)
            // 计算百分比
            const percentageNum = Math.round((calculatedWeight / crop.maxWeight) * 100)
            setPercentage(percentageNum.toString())
          }
        }
      } catch (e) {
        // 解析失败，不更新重量
      }
    }
  }, [priceInput, calculationMode, crop, selectedMutations])

  if (!crop) {
    return null
  }

  /**
   * 处理重量输入变化
   * - 自动切换到重量计算模式
   * - 验证输入格式
   * - 限制在最大重量范围内
   * - 自动计算百分比
   */
  const handleWeightChange = (value: string) => {
    // 切换到重量计算模式
    if (calculationMode !== 'weight') {
      setCalculationMode('weight')
      setIsEditingPrice(false)
      setPriceInput('')
    }
    
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
   * - 限制在1-100之间
   * - 自动转换为重量
   */
  const handlePercentageChange = (value: string) => {
    // 切换到重量计算模式
    if (calculationMode !== 'weight') {
      setCalculationMode('weight')
      setIsEditingPrice(false)
      setPriceInput('')
    }
    
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
  
  return (
    <div className="price-calculator">
      <CalculatorHeader
        crop={crop}
        onBack={onBack}
        weight={weight}
        percentage={percentage}
        selectedMutations={selectedMutations}
        onShareClick={(url) => {
          setShareUrl(url)
          setShowShareModal(true)
        }}
        onError={showToastMessage}
      />

      <div className="calculator-inputs">
        <WeightInputGroup
          crop={crop}
          weight={weight}
          percentage={percentage}
          calculationMode={calculationMode}
          onWeightChange={handleWeightChange}
          onPercentageChange={handlePercentageChange}
          onFocus={handleInputFocus}
        />

        <MutationGroups
          crop={crop}
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
        onSave={handleSaveToHistory}
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
        crop={crop}
        selectedMutations={selectedMutations}
        onClose={() => setShowShareModal(false)}
        onCopy={showToastMessage}
      />

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
