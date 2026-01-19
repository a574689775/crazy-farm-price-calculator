import { useState, useEffect, useRef } from 'react'
import { formatPrice, parseFormattedPrice, convertToYuan } from '@/utils/priceCalculator'

/**
 * 价格数字滚动动画 Hook
 * 当目标价格变化时，使用动画从当前价格平滑过渡到目标价格
 * 
 * @param targetPrice 目标价格（格式化后的字符串，如 "1.5万"）
 * @returns 当前显示的价格（格式化后的字符串）
 */
export const useAnimatedPrice = (targetPrice: string) => {
  const [displayPrice, setDisplayPrice] = useState(targetPrice)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const startValueRef = useRef<number>(0)
  const targetValueRef = useRef<number>(0)
  const startUnitRef = useRef<'元' | '万' | '亿'>('元')
  const targetUnitRef = useRef<'元' | '万' | '亿'>('元')

  useEffect(() => {
    // 如果目标价格和当前显示价格相同，不需要动画
    if (targetPrice === displayPrice) return

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
