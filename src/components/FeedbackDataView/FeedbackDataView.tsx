import { useState, useEffect, useMemo } from 'react'
import { supabase, type FeedbackData } from '@/utils/supabase'
import { crops } from '@/data/crops'
import { formatPrice, parseFormattedPrice } from '@/utils/priceCalculator'
import { getWeatherMutation } from '@/data/weatherMutations'
import type { CropConfig, WeatherMutation } from '@/types'
import './FeedbackDataView.css'

interface FeedbackRecord extends FeedbackData {
  id: number
  created_at: string
}

interface CalculatedPriceResult {
  adjustedPrice: number
  formattedAdjustedPrice: string
}

export const FeedbackDataView = () => {
  const [selectedCrop, setSelectedCrop] = useState<CropConfig | null>(null)
  const [feedbackData, setFeedbackData] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [adjustedCoefficient, setAdjustedCoefficient] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // 获取所有反馈数据
  const fetchFeedbackData = async (cropName?: string) => {
    setLoading(true)
    setError('')
    try {
      // 构建查询
      let query = supabase
        .from('price_feedback')
        .select('*')
        .order('created_at', { ascending: false })

      // 如果有作物名称，添加筛选条件
      if (cropName) {
        query = query.eq('crop_name', cropName)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Supabase query error:', fetchError)
        throw fetchError
      }

      console.log('Query result:', { 
        dataLength: data?.length, 
        error: fetchError,
        cropName
      })

      setFeedbackData(data || [])
    } catch (err: any) {
      console.error('Error fetching feedback data:', err)
      setError(err.message || '获取数据失败')
      setFeedbackData([])
    } finally {
      setLoading(false)
    }
  }

  // 初始加载所有数据
  useEffect(() => {
    fetchFeedbackData()
  }, [])

  // 当选择作物时，筛选数据
  const handleCropSelect = (crop: CropConfig) => {
    setSelectedCrop(crop)
    setAdjustedCoefficient(null) // 重置调整后的基数
    fetchFeedbackData(crop.name)
  }

  // 清除筛选
  const handleClearFilter = () => {
    setSelectedCrop(null)
    setAdjustedCoefficient(null)
    fetchFeedbackData()
  }

  // 解析突变并计算倍数
  const parseMutations = (mutationsData: any) => {
    const INNATE_MUTATIONS = new Set<WeatherMutation>(['银', '金', '水晶', '流光'])
    const SPECIAL_MUTATIONS = new Set<WeatherMutation>(['薯片', '方形', '糖葫芦', '连体', '黄瓜蛇', '万圣夜', '香蕉猴', '笑日葵'])

    let mutations: WeatherMutation[] = []
    if (mutationsData) {
      if (Array.isArray(mutationsData)) {
        mutations = mutationsData as WeatherMutation[]
      } else {
        const mutationsStr = String(mutationsData)
        try {
          const parsed = JSON.parse(mutationsStr)
          mutations = Array.isArray(parsed) ? parsed as WeatherMutation[] : []
        } catch {
          const parts = mutationsStr.split(/[、,，;；]/)
          mutations = parts.filter((m: string) => m.trim()).map((m: string) => m.trim()) as WeatherMutation[]
        }
      }
    }

    let innateMultiplier = 1
    let weatherMultiplierSum = 0
    let specialMultiplier = 1

    mutations.forEach(mutationName => {
      const mutation = getWeatherMutation(mutationName)
      if (!mutation) return

      if (INNATE_MUTATIONS.has(mutationName)) {
        innateMultiplier = Math.max(innateMultiplier, mutation.multiplier)
      } else if (SPECIAL_MUTATIONS.has(mutationName)) {
        specialMultiplier = Math.max(specialMultiplier, mutation.multiplier)
      } else {
        weatherMultiplierSum += mutation.multiplier
      }
    })

    // 计算总倍数因子
    const totalMultiplier = innateMultiplier * (weatherMultiplierSum + 1) * specialMultiplier

    return {
      mutations,
      innateMultiplier,
      weatherMultiplierSum,
      specialMultiplier,
      totalMultiplier
    }
  }

  // 计算调整后的价格
  const calculateAdjustedPrice = (item: FeedbackRecord, newCoefficient: number): CalculatedPriceResult => {
    const { totalMultiplier } = parseMutations(item.mutations)

    // 使用新基数计算价格
    const adjustedPrice = newCoefficient * totalMultiplier * Math.pow(item.weight, 1.5)

    return {
      adjustedPrice,
      formattedAdjustedPrice: formatPrice(adjustedPrice)
    }
  }

  // 获取实际价格（准确的数据用计算价格，但保留两位小数）
  const getActualPrice = (item: FeedbackRecord): number => {
    if (item.is_accurate) {
      // 准确的数据：用户看到的是格式化后的价格（如"2.07亿"）
      // 需要从格式化价格反推实际价格，确保与用户看到的一致
      const formatted = formatPrice(item.calculated_price)
      const { value, unit } = parseFormattedPrice(formatted)
      
      // 转换回元
      if (unit === '亿') {
        return value * 100_000_000
      } else if (unit === '万') {
        return value * 10_000
      } else {
        return value
      }
    }
    return item.actual_price || item.calculated_price
  }

  // 计算统计信息
  const statistics = useMemo(() => {
    if (!selectedCrop || feedbackData.length === 0) return null

    const currentCoefficient = adjustedCoefficient ?? selectedCrop.priceCoefficient
    const actualPrices: number[] = []
    const adjustedPrices: number[] = []
    const originalPrices: number[] = []

    feedbackData.forEach(item => {
      const actualPrice = getActualPrice(item)
      const { adjustedPrice } = calculateAdjustedPrice(item, currentCoefficient)
      
      actualPrices.push(actualPrice)
      adjustedPrices.push(adjustedPrice)
      originalPrices.push(item.calculated_price)
    })

    // 计算平均误差
    const adjustedErrors = adjustedPrices.map((adj, i) => Math.abs(adj - actualPrices[i]))
    const originalErrors = originalPrices.map((orig, i) => Math.abs(orig - actualPrices[i]))
    
    const avgAdjustedError = adjustedErrors.reduce((sum, err) => sum + err, 0) / adjustedErrors.length
    const avgOriginalError = originalErrors.reduce((sum, err) => sum + err, 0) / originalErrors.length

    return {
      avgAdjustedError,
      avgOriginalError,
      improvement: avgOriginalError > 0 
        ? ((avgOriginalError - avgAdjustedError) / avgOriginalError) * 100 
        : 0
    }
  }, [selectedCrop, feedbackData, adjustedCoefficient])

  // 自动计算最优基数
  const calculateOptimalCoefficient = () => {
    if (!selectedCrop || feedbackData.length === 0) return

    setIsCalculating(true)

    // 使用 setTimeout 让 UI 有机会更新
    setTimeout(() => {
      try {
        const baseCoefficient = selectedCrop.priceCoefficient
        const actualPrices: number[] = []
        const multipliers: number[] = []
        const weights: number[] = []

        // 预处理数据
        feedbackData.forEach(item => {
          const actualPrice = getActualPrice(item)
          const { totalMultiplier } = parseMutations(item.mutations)
          
          actualPrices.push(actualPrice)
          multipliers.push(totalMultiplier)
          weights.push(Math.pow(item.weight, 1.5))
        })

        // 搜索范围：当前基数的 50% 到 200%
        const minCoefficient = baseCoefficient * 0.5
        const maxCoefficient = baseCoefficient * 2.0
        const step = Math.max(baseCoefficient * 0.001, 0.01) // 步长为基数的 0.1% 或最小 0.01

        let bestCoefficient = baseCoefficient
        let minError = Infinity

        // 粗搜索：大步长
        for (let coeff = minCoefficient; coeff <= maxCoefficient; coeff += step * 10) {
          let totalError = 0
          
          for (let i = 0; i < feedbackData.length; i++) {
            const calculatedPrice = coeff * multipliers[i] * weights[i]
            const error = Math.abs(calculatedPrice - actualPrices[i])
            totalError += error
          }
          
          const avgError = totalError / feedbackData.length
          
          if (avgError < minError) {
            minError = avgError
            bestCoefficient = coeff
          }
        }

        // 细搜索：在最优值附近小步长搜索
        const fineSearchRange = step * 10
        const fineMin = Math.max(minCoefficient, bestCoefficient - fineSearchRange)
        const fineMax = Math.min(maxCoefficient, bestCoefficient + fineSearchRange)

        for (let coeff = fineMin; coeff <= fineMax; coeff += step) {
          let totalError = 0
          
          for (let i = 0; i < feedbackData.length; i++) {
            const calculatedPrice = coeff * multipliers[i] * weights[i]
            const error = Math.abs(calculatedPrice - actualPrices[i])
            totalError += error
          }
          
          const avgError = totalError / feedbackData.length
          
          if (avgError < minError) {
            minError = avgError
            bestCoefficient = coeff
          }
        }

        // 保留合理的小数位数
        bestCoefficient = Math.round(bestCoefficient * 100) / 100
        
        setAdjustedCoefficient(bestCoefficient)
      } catch (err) {
        console.error('计算最优基数失败:', err)
        setError('计算最优基数失败')
      } finally {
        setIsCalculating(false)
      }
    }, 10)
  }

  // 获取作物统计数据
  const getCropStats = () => {
    if (!selectedCrop) return null

    const cropData = feedbackData.filter(item => item.crop_name === selectedCrop.name)
    const total = cropData.length
    const accurate = cropData.filter(item => item.is_accurate).length
    const inaccurate = cropData.filter(item => !item.is_accurate).length

    return { total, accurate, inaccurate }
  }

  const stats = getCropStats()

  return (
    <div className="feedback-data-view">
      <div className="feedback-data-content">
        {/* 作物选择区域 */}
        <div className="feedback-crop-selector">
          <h2 className="feedback-section-title">选择作物</h2>
          <div className="feedback-crop-list">
            {crops.map((crop) => (
              <div
                key={crop.name}
                className={`feedback-crop-item ${selectedCrop?.name === crop.name ? 'selected' : ''}`}
                onClick={() => handleCropSelect(crop)}
              >
                {crop.name}
              </div>
            ))}
          </div>
          {selectedCrop && (
            <button className="feedback-clear-filter" onClick={handleClearFilter}>
              清除筛选
            </button>
          )}
        </div>

        {/* 数据展示区域 */}
        <div className="feedback-data-display">
          {selectedCrop && (
            <>
              {/* 基数调整区域 */}
              <div className="feedback-coefficient-adjust">
                <div className="coefficient-input-group">
                  <label className="coefficient-label">默认基数：</label>
                  <span className="coefficient-value">{selectedCrop.priceCoefficient}</span>
                </div>
                <div className="coefficient-input-group">
                  <label className="coefficient-label">调整后基数：</label>
                  <input
                    type="number"
                    className="coefficient-input"
                    value={adjustedCoefficient ?? selectedCrop.priceCoefficient}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      setAdjustedCoefficient(isNaN(value) ? null : value)
                    }}
                    step="0.01"
                  />
                </div>
                <button
                  className="coefficient-auto"
                  onClick={calculateOptimalCoefficient}
                  disabled={isCalculating || feedbackData.length === 0}
                >
                  {isCalculating ? '计算中...' : '自动计算最优基数'}
                </button>
                {adjustedCoefficient !== null && adjustedCoefficient !== selectedCrop.priceCoefficient && (
                  <button
                    className="coefficient-reset"
                    onClick={() => setAdjustedCoefficient(null)}
                  >
                    重置
                  </button>
                )}
              </div>

              {/* 统计信息 */}
              {stats && statistics && (
                <div className="feedback-stats">
                  <div className="feedback-stats-row">
                    <div className="feedback-stat-item">
                      <span className="feedback-stat-label">总反馈数：</span>
                      <span className="feedback-stat-value">{stats.total}</span>
                    </div>
                    <div className="feedback-stat-item">
                      <span className="feedback-stat-label">准确：</span>
                      <span className="feedback-stat-value accurate">{stats.accurate}</span>
                    </div>
                    <div className="feedback-stat-item">
                      <span className="feedback-stat-label">不准确：</span>
                      <span className="feedback-stat-value inaccurate">{stats.inaccurate}</span>
                    </div>
                  </div>
                  <div className="feedback-stats-row">
                    <div className="feedback-stat-item">
                      <span className="feedback-stat-label">原平均误差：</span>
                      <span className="feedback-stat-value">{formatPrice(statistics.avgOriginalError)}</span>
                    </div>
                    <div className="feedback-stat-item">
                      <span className="feedback-stat-label">调整后平均误差：</span>
                      <span className={`feedback-stat-value ${statistics.avgAdjustedError < statistics.avgOriginalError ? 'accurate' : 'inaccurate'}`}>
                        {formatPrice(statistics.avgAdjustedError)}
                      </span>
                    </div>
                    {statistics.improvement > 0 && (
                      <div className="feedback-stat-item">
                        <span className="feedback-stat-label">改善：</span>
                        <span className="feedback-stat-value accurate">
                          {statistics.improvement.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {loading ? (
            <div className="feedback-loading">加载中...</div>
          ) : error ? (
            <div className="feedback-error">{error}</div>
          ) : !selectedCrop ? (
            <div className="feedback-empty">请先选择作物</div>
          ) : feedbackData.length === 0 ? (
            <div className="feedback-empty">暂无 {selectedCrop.name} 的反馈数据</div>
          ) : (
            <div className="feedback-data-table-wrapper">
              <table className="feedback-data-table">
                <thead>
                  <tr>
                    <th>作物</th>
                    <th>重量</th>
                    <th>突变倍数</th>
                    <th>计算价格</th>
                    <th>调整后价格</th>
                    <th>实际价格</th>
                    <th>误差</th>
                    <th>准确率</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackData.map((item) => {
                    const { totalMultiplier } = parseMutations(item.mutations)
                    const currentCoefficient = adjustedCoefficient ?? selectedCrop!.priceCoefficient
                    const { adjustedPrice, formattedAdjustedPrice } = calculateAdjustedPrice(item, currentCoefficient)
                    const actualPrice = getActualPrice(item)
                    
                    // 计算误差（调整后价格与实际价格的差值）
                    const error = Math.abs(adjustedPrice - actualPrice)
                    
                    // 计算准确率（1 - 相对误差）* 100%
                    const accuracy = actualPrice > 0 
                      ? Math.max(0, (1 - error / actualPrice) * 100) 
                      : 0

                    return (
                      <tr key={item.id}>
                        <td>{item.crop_name}</td>
                        <td>{item.weight}kg</td>
                        <td>{totalMultiplier.toFixed(2)}×</td>
                        <td>{formatPrice(item.calculated_price)}</td>
                        <td>{formattedAdjustedPrice}</td>
                        <td>{formatPrice(actualPrice)}</td>
                        <td>{formatPrice(error)}</td>
                        <td className={accuracy >= 95 ? 'accuracy-high' : accuracy >= 90 ? 'accuracy-medium' : 'accuracy-low'}>
                          {accuracy.toFixed(2)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

