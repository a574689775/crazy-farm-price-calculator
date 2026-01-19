import { SaveOutlined } from '@ant-design/icons'
import { GradientButton } from '@/components/GradientButton'
import type { CalculationMode } from './types'
import './PriceCalculator.css'

interface ResultAreaProps {
  calculationMode: CalculationMode
  displayPrice: string
  priceInput: string
  isEditingPrice: boolean
  isValidWeight: boolean
  onPriceClick: () => void
  onPriceChange: (value: string) => void
  onPriceBlur: () => void
  onSave: () => void
  onFeedback: () => void
}

/**
 * 价格展示区域组件
 * 包含反馈按钮、保存按钮、价格显示
 */
export const ResultArea = ({
  calculationMode,
  displayPrice,
  priceInput,
  isEditingPrice,
  onPriceClick,
  onPriceChange,
  onPriceBlur,
  onSave,
  onFeedback,
}: ResultAreaProps) => {
  return (
    <div className="calculator-result-fixed">
      <GradientButton onClick={onFeedback}>
        反馈
      </GradientButton>
      <div className="result-right">
        {calculationMode === 'price' && (
          <span className="mode-hint">按价格计算</span>
        )}
        {calculationMode === 'weight' && (
          <span className="mode-hint">按重量计算</span>
        )}
        <button className="save-button" onClick={onSave}>
          <SaveOutlined />
        </button>
        <div className="result-value-container">
          {isEditingPrice ? (
            <input
              type="text"
              className="result-value-input"
              value={priceInput}
              onChange={(e) => onPriceChange(e.target.value)}
              onBlur={onPriceBlur}
              placeholder="输入价格"
              autoFocus={true}
            />
          ) : (
            <span 
              className="result-value-large"
              onClick={onPriceClick}
              style={{ cursor: 'pointer' }}
            >
              {displayPrice}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
