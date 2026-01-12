import { useState, useEffect } from 'react'
import type { CropConfig, WeatherMutation } from '@/types'
import { weatherMutations, mutationColorConfig } from '@/data/weatherMutations'
import { calculatePrice, formatWeight } from '@/utils/priceCalculator'
import './PriceCalculator.css'

interface PriceCalculatorProps {
  crop: CropConfig | null
}

// 常规突变组合
const NORMAL_MUTATIONS: WeatherMutation[] = [
  '瓷化', '亮晶晶', '极光', '落雷', '冰冻', '颤栗', '潮湿', '覆雪', '迷雾', '生机'
]

export const PriceCalculator = ({ crop }: PriceCalculatorProps) => {
  const [weight, setWeight] = useState<string>('')
  const [selectedMutations, setSelectedMutations] = useState<WeatherMutation[]>([])

  // 当作物切换时，清空重量和突变
  useEffect(() => {
    setWeight('')
    setSelectedMutations([])
  }, [crop?.name])

  if (!crop) {
    return (
      <div className="price-calculator empty">
        <p>请先选择作物</p>
      </div>
    )
  }

  const weightNum = parseFloat(weight) || 0
  const isValidWeight = weightNum > 0 && weightNum <= crop.maxWeight

  // 只要有重量就可以计算，不一定要有突变
  const result = isValidWeight
    ? calculatePrice(crop, weightNum, selectedMutations)
    : null

  const toggleMutation = (mutationName: WeatherMutation) => {
    setSelectedMutations(prev => {
      if (prev.includes(mutationName)) {
        return prev.filter(m => m !== mutationName)
      }
      return [...prev, mutationName]
    })
  }

  // 计算互斥状态
  const isAllSelected = selectedMutations.length === weatherMutations.length && selectedMutations.length > 0
  const isNormalOnly = selectedMutations.length === NORMAL_MUTATIONS.length && 
    NORMAL_MUTATIONS.every(m => selectedMutations.includes(m))
  const isNoneSelected = selectedMutations.length === 0

  const handleClearAll = () => {
    setSelectedMutations([])
  }

  const handleSelectNormal = () => {
    setSelectedMutations(NORMAL_MUTATIONS)
  }

  const handleSelectAll = () => {
    setSelectedMutations(weatherMutations.map(m => m.name))
  }

  return (
    <div className="price-calculator">
      <h3 className="calculator-title">价格计算器</h3>

      <div className="calculator-inputs">
        <div className="input-group">
          <label className="input-label">
            重量 (kg)
            <span className="input-hint">最大: {crop.maxWeight}kg</span>
          </label>
          <input
            type="number"
            className="input-field"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="请输入重量"
            min="0"
            max={crop.maxWeight}
            step="0.01"
          />
          {weightNum > crop.maxWeight && (
            <span className="input-error">重量不能超过 {crop.maxWeight}kg</span>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">选择突变</label>
          
          {/* 快捷操作 checkbox */}
          <div className="quick-actions">
            <label className="quick-action-item">
              <input
                type="checkbox"
                checked={isNoneSelected}
                onChange={handleClearAll}
              />
              <span>清空</span>
            </label>
            <label className="quick-action-item">
              <input
                type="checkbox"
                checked={isNormalOnly}
                onChange={handleSelectNormal}
              />
              <span>常规突变</span>
            </label>
            <label className="quick-action-item">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
              />
              <span>全选</span>
            </label>
          </div>

          {/* 突变列表 */}
          <div className="mutations-list">
            {weatherMutations.map(mutation => {
              const isSelected = selectedMutations.includes(mutation.name)
              const colorConfig = mutationColorConfig[mutation.color]
              
              return (
                <button
                  key={mutation.name}
                  type="button"
                  className={`mutation-item ${isSelected ? 'selected' : ''}`}
                  style={{
                    background: colorConfig.gradient || colorConfig.bgColor,
                  }}
                  onClick={() => toggleMutation(mutation.name)}
                >
                  <span className="mutation-name">{mutation.name}</span>
                  {isSelected && (
                    <span className="mutation-checkmark">✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {result && (
        <div className="calculator-result">
          <div className="result-item">
            <span className="result-label">重量</span>
            <span className="result-value">{formatWeight(weightNum)}</span>
          </div>
          {selectedMutations.length > 0 && (
            <div className="result-item">
              <span className="result-label">突变总倍数</span>
              <span className="result-value">{result.totalMultiplier}</span>
            </div>
          )}
          <div className="result-item highlight">
            <span className="result-label">最终价格</span>
            <span className="result-value-large">{result.formattedPrice}</span>
          </div>
        </div>
      )}
    </div>
  )
}
