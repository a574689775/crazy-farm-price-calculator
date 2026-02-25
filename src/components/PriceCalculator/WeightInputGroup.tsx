import { InputNumber } from 'antd'
import type { CropConfig } from '@/types'
import { getCropImagePath } from '@/data/crops'
import { SVGText } from '@/components/SVGText'
import type { CalculationMode } from './types'
import './PriceCalculator.css'

interface WeightInputGroupProps {
  crop: CropConfig
  weight: string
  percentage: string
  /** 生长速度：生长耗时的 1%，单位秒。用户可实测填写，或由重量自动算出 */
  growthSpeed: string
  calculationMode: CalculationMode
  minWeight: number
  minPercentage: number
  onWeightChange: (value: number | null) => void
  onPercentageChange: (value: number | null) => void
  onGrowthSpeedChange: (value: number | null) => void
  onGrowthSpeedBlur?: () => void
  onFocus: () => void
}

/**
 * 格式化时间为可读格式
 * @param totalSeconds 总秒数
 * @returns 格式化后的时间字符串（x秒、x分钟、或x小时x分）
 */
const formatGrowthTime = (totalSeconds: number): string => {
  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)}秒`
  }
  
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) {
    return `${totalMinutes}分钟`
  }
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  if (minutes === 0) {
    return `${hours}小时`
  }
  
  return `${hours}小时${minutes}分`
}

/**
 * 重量和百分比输入组组件
 * 包含重量输入、百分比输入和预计生长时间显示
 */
export const WeightInputGroup = ({
  crop,
  weight,
  percentage,
  growthSpeed,
  calculationMode,
  minWeight,
  minPercentage,
  onWeightChange,
  onPercentageChange,
  onGrowthSpeedChange,
  onGrowthSpeedBlur,
  onFocus,
}: WeightInputGroupProps) => {
  // 格式化最小重量显示（保留2位小数，去除末尾0）
  const formattedMinWeight = minWeight.toFixed(2).replace(/\.?0+$/, '')
  const formattedMaxWeight = crop.maxWeight.toFixed(2).replace(/\.?0+$/, '')
  
  const weightValue = weight === '' ? null : parseFloat(weight) || null
  const percentageValue = percentage === '' ? null : parseFloat(percentage) || null
  const growthSpeedValue = growthSpeed === '' ? null : parseFloat(growthSpeed) || null
  
  // 生长速度 = 生长耗时的 1%，单位秒。故 生长耗时 = 用户填了生长速度 ? 生长速度×100 : 重量×crop.growthSpeed
  const weightNum = parseFloat(weight) || 0
  const growthTimeSeconds =
    growthSpeedValue != null && growthSpeedValue > 0
      ? growthSpeedValue * 100
      : weightNum > 0 && crop.growthSpeed > 0
        ? weightNum * crop.growthSpeed
        : 0
  const formattedGrowthTime = growthTimeSeconds > 0 ? formatGrowthTime(growthTimeSeconds) : ''

  return (
    <div className="input-group">
      <div className="input-group-row-with-image">
        <div className="input-fields-wrapper">
          <div className="input-group-row">
            <label className="input-label">
              <SVGText
                fillColor="#843100"
                /* 去掉白色描边，保持文字简洁干净 */
                strokeColor="transparent"
                strokeWidth={0}
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
                strokeColor="transparent"
                strokeWidth={0}
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
          <div className="input-group-row">
            <label className="input-label">
              <SVGText
                fillColor="#843100"
                strokeColor="transparent"
                strokeWidth={0}
                fontSize={14}
                fontWeight={700}
                textAlign="left"
              >
                生长速度
              </SVGText>
            </label>
            <InputNumber
              className="input-field"
              value={growthSpeedValue}
              onChange={onGrowthSpeedChange}
              onBlur={onGrowthSpeedBlur}
              onFocus={onFocus}
              placeholder={weightNum > 0 ? `${(weightNum * crop.growthSpeed * 0.01).toFixed(2)}` : '秒 / 百分比'}
              min={0}
              step={0.1}
              precision={2}
              readOnly={calculationMode === 'price'}
              controls={false}
            />
          </div>
          <div className="input-group-row">
            <label className="input-label">
              <SVGText
                fillColor="#843100"
                strokeColor="transparent"
                strokeWidth={0}
                fontSize={14}
                fontWeight={700}
                textAlign="left"
              >
                生长耗时
              </SVGText>
            </label>
            <div className="growth-time-value">
              <SVGText
                fillColor="#843100"
                strokeColor="transparent"
                strokeWidth={0}
                fontSize={14}
                fontWeight={600}
                textAlign="left"
              >
                {formattedGrowthTime ? formattedGrowthTime : '--'}
              </SVGText>
            </div>
          </div>
        </div>
        <img 
          src={getCropImagePath(crop.name)}
          alt={crop.name}
          className="crop-image"
        />
      </div>
    </div>
  )
}
