import type { CropConfig } from '@/types'
import { SVGText } from '@/components/SVGText'
import type { CalculationMode } from './types'
import './PriceCalculator.css'

interface WeightInputGroupProps {
  crop: CropConfig
  weight: string
  percentage: string
  calculationMode: CalculationMode
  onWeightChange: (value: string) => void
  onPercentageChange: (value: string) => void
  onFocus: () => void
}

/**
 * 重量和百分比输入组组件
 */
export const WeightInputGroup = ({
  crop,
  weight,
  percentage,
  calculationMode,
  onWeightChange,
  onPercentageChange,
  onFocus,
}: WeightInputGroupProps) => {
  const weightNum = parseFloat(weight) || 0

  return (
    <div className="input-group">
      <div className="input-group-row-with-image">
        <div className="input-fields-wrapper">
          <div className="input-group-row">
            <label className="input-label">
              <SVGText
                fillColor="#843100"
                strokeColor="#fff"
                strokeWidth={2}
                fontSize={14}
                fontWeight={700}
                textAlign="left"
              >
                重量 (kg)
              </SVGText>
            </label>
            <input
              type="number"
              className="input-field"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              onFocus={onFocus}
              placeholder={`最大: ${crop.maxWeight}`}
              min="0"
              max={crop.maxWeight}
              step="0.01"
              readOnly={calculationMode === 'price'}
            />
          </div>
          <div className="input-group-row">
            <label className="input-label">
              <SVGText
                fillColor="#843100"
                strokeColor="#fff"
                strokeWidth={2}
                fontSize={14}
                fontWeight={700}
                textAlign="left"
              >
                百分比 (%)
              </SVGText>
            </label>
            <input
              type="number"
              className="input-field"
              value={percentage}
              onChange={(e) => onPercentageChange(e.target.value)}
              onFocus={onFocus}
              placeholder="范围: 1-100"
              min="1"
              max="100"
              step="1"
              readOnly={calculationMode === 'price'}
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
  )
}
