import { InputNumber } from 'antd'
import type { CropConfig } from '@/types'
import { SVGText } from '@/components/SVGText'
import type { CalculationMode } from './types'
import './PriceCalculator.css'

interface WeightInputGroupProps {
  crop: CropConfig
  weight: string
  percentage: string
  calculationMode: CalculationMode
  minWeight: number
  minPercentage: number
  onWeightChange: (value: number | null) => void
  onPercentageChange: (value: number | null) => void
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
  minWeight,
  minPercentage,
  onWeightChange,
  onPercentageChange,
  onFocus,
}: WeightInputGroupProps) => {
  // 格式化最小重量显示（保留2位小数，去除末尾0）
  const formattedMinWeight = minWeight.toFixed(2).replace(/\.?0+$/, '')
  const formattedMaxWeight = crop.maxWeight.toFixed(2).replace(/\.?0+$/, '')
  
  const weightValue = weight === '' ? null : parseFloat(weight) || null
  const percentageValue = percentage === '' ? null : parseFloat(percentage) || null

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
            <InputNumber
              className="input-field"
              value={weightValue}
              onChange={onWeightChange}
              onFocus={onFocus}
              placeholder={`${formattedMinWeight}~${formattedMaxWeight}`}
              min={minWeight}
              max={crop.maxWeight}
              step={0.01}
              precision={2}
              readOnly={calculationMode === 'price'}
              controls={false}
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
            <InputNumber
              className="input-field"
              value={percentageValue}
              onChange={onPercentageChange}
              onFocus={onFocus}
              placeholder={`${minPercentage}~100`}
              min={minPercentage}
              max={100}
              step={1}
              precision={0}
              readOnly={calculationMode === 'price'}
              controls={false}
            />
          </div>
        </div>
        <img 
          src={`https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/${crop.name}.png`}
          alt={crop.name}
          className="crop-image"
        />
      </div>
    </div>
  )
}
