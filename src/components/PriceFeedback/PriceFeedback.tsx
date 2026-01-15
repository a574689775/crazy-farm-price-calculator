import { useState } from 'react'
import { Modal } from '@/components/Modal'
import { submitFeedback, type FeedbackData } from '@/utils/supabase'
import type { CropConfig, WeatherMutation } from '@/types'
import { parseFormattedPrice, convertToYuan } from '@/utils/priceCalculator'
import './PriceFeedback.css'

interface PriceFeedbackProps {
  isOpen: boolean
  onClose: () => void
  crop: CropConfig | null
  weight: number
  mutations: WeatherMutation[]
  calculatedPrice: number
  formattedPrice: string
}

export const PriceFeedback = ({ 
  isOpen, 
  onClose, 
  crop, 
  weight, 
  mutations, 
  calculatedPrice,
  formattedPrice
}: PriceFeedbackProps) => {
  const [isAccurate, setIsAccurate] = useState<boolean | null>(null)
  const [actualPrice, setActualPrice] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [showToast, setShowToast] = useState(false)

  // 从格式化价格中提取单位
  const { unit: priceUnit } = parseFormattedPrice(formattedPrice)

  const handleClose = () => {
    setIsAccurate(null)
    setActualPrice('')
    setError('')
    onClose()
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="价格反馈"
      >
        <div className="price-feedback">
          <div className="feedback-question">
            <p className="feedback-question-text">计算结果是否准确？</p>
          </div>

          <div className="feedback-options">
            <button
              className={`feedback-option ${isAccurate === true ? 'active' : ''}`}
              onClick={async () => {
                setIsAccurate(true)
                setError('')
                
                // 选择准确后直接提交
                if (!crop) {
                  setError('作物信息缺失')
                  return
                }

                setIsSubmitting(true)
                setError('')

                try {
                  const feedbackData: FeedbackData = {
                    crop_name: crop.name,
                    weight: weight,
                    mutations: mutations,
                    calculated_price: calculatedPrice,
                    actual_price: null,
                    is_accurate: true,
                  }

                  await submitFeedback(feedbackData)
                  
                  // 关闭弹窗并显示 Toast
                  handleClose()
                  setShowToast(true)
                  setTimeout(() => {
                    setShowToast(false)
                  }, 2000)
                } catch (err: any) {
                  setError(err.message || '提交失败，请稍后重试')
                  setIsAccurate(null)
                } finally {
                  setIsSubmitting(false)
                }
              }}
              disabled={isSubmitting}
            >
              {isSubmitting && isAccurate === true ? '提交中...' : '准确'}
            </button>
            <button
              className={`feedback-option ${isAccurate === false ? 'active' : ''}`}
              onClick={() => {
                setIsAccurate(false)
                setError('')
              }}
              disabled={isSubmitting}
            >
              不准确
            </button>
          </div>

          {isAccurate === false && (
            <div className="feedback-actual-price">
              <label className="feedback-label">真实价格 ({priceUnit})</label>
              <div className="feedback-input-wrapper">
                <input
                  type="number"
                  className="feedback-input"
                  value={actualPrice}
                  onChange={(e) => {
                    setActualPrice(e.target.value)
                    setError('')
                  }}
                  placeholder={`请输入真实价格（单位：${priceUnit}）`}
                  min="0"
                  step={priceUnit === '元' ? '0.01' : '0.01'}
                />
                <span className="feedback-input-unit">{priceUnit}</span>
              </div>
              <p className="feedback-hint">
                计算结果：{formattedPrice}，请按相同单位输入
              </p>
            </div>
          )}

          {error && (
            <div className="feedback-error">
              {error}
            </div>
          )}

          {/* 只有选择不准确时才显示提交按钮 */}
          {isAccurate === false && (
            <div className="feedback-actions">
              <button
                className="feedback-submit"
                onClick={async () => {
                  if (isAccurate === null) {
                    setError('请先选择价格是否准确')
                    return
                  }

                  if (isAccurate === false && !actualPrice.trim()) {
                    setError('请输入真实价格')
                    return
                  }

                  if (!crop) {
                    setError('作物信息缺失')
                    return
                  }

                  setIsSubmitting(true)
                  setError('')

                  try {
                    // 将用户输入的单位值转换为元（原始数值）
                    const actualPriceInYuan = convertToYuan(parseFloat(actualPrice), priceUnit)

                    const feedbackData: FeedbackData = {
                      crop_name: crop.name,
                      weight: weight,
                      mutations: mutations,
                      calculated_price: calculatedPrice,
                      actual_price: actualPriceInYuan,
                      is_accurate: false,
                    }

                    await submitFeedback(feedbackData)
                    
                    // 关闭弹窗并显示 Toast
                    handleClose()
                    setShowToast(true)
                    setTimeout(() => {
                      setShowToast(false)
                    }, 2000)
                  } catch (err: any) {
                    setError(err.message || '提交失败，请稍后重试')
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? '提交中...' : '提交反馈'}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Toast 提示 */}
      {showToast && (
        <div className="toast">
          <div className="toast-content">感谢您的反馈！</div>
        </div>
      )}
    </>
  )
}

