import { useState, useEffect, useMemo } from 'react'
import { supabase, type FeedbackData, deleteFeedback } from '@/utils/supabase'
import { crops } from '@/data/crops'
import { formatPrice, parseFormattedPrice, convertToYuan } from '@/utils/priceCalculator'
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
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
  const [accuracySortOrder, setAccuracySortOrder] = useState<'asc' | 'desc' | null>(null)

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

  // 删除记录（从数据库删除）
  const handleDeleteRecord = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？此操作不可恢复。')) {
      return
    }

    setDeletingIds(prev => new Set([...prev, id]))
    
    try {
      await deleteFeedback(id)
      // 从本地状态中移除该记录
      setFeedbackData(prev => prev.filter(item => item.id !== id))
    } catch (err: any) {
      console.error('删除记录失败:', err)
      setError(err.message || '删除记录失败')
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  // 获取过滤后的数据（现在不需要过滤，因为已删除的记录已经从数据库中删除）
  const getFilteredData = () => {
    return feedbackData
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

  // 获取实际价格
  const getActualPrice = (item: FeedbackRecord): number => {
    if (item.is_accurate) {
      // 准确的数据：用户看到的是格式化后的价格（如"2.07亿"），需要从格式化价格反推
      // 这样与实际用户看到的精度一致（补0）
      const formatted = formatPrice(item.calculated_price)
      const { value, unit } = parseFormattedPrice(formatted)
      return convertToYuan(value, unit)
    }
    return item.actual_price || item.calculated_price
  }

  // 计算统计信息
  const statistics = useMemo(() => {
    if (!selectedCrop || feedbackData.length === 0) return null

    // 使用过滤后的数据（排除已删除的记录）
    const filteredData = getFilteredData()
    if (filteredData.length === 0) return null

    const currentCoefficient = adjustedCoefficient ?? selectedCrop.priceCoefficient
    const actualPrices: number[] = []
    const adjustedPrices: number[] = []
    const originalPrices: number[] = []

    filteredData.forEach(item => {
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

  /**
   * 加权中位数：使「所有条目的误差之和」最小的基数，等于反推系数的加权中位数（权重 = factor）。
   * 即最小化 sum_i |c * factor_i - actualPrice_i| 的解。
   */
  const weightedMedianCoefficient = (
    data: Array<{ actualPrice: number; multiplier: number; weightPower: number }>
  ): number => {
    const pairs: { value: number; weight: number }[] = []
    for (const item of data) {
      const factor = item.multiplier * item.weightPower
      if (factor <= 0 || item.actualPrice <= 0) continue
      pairs.push({ value: item.actualPrice / factor, weight: factor })
    }
    if (pairs.length === 0) return 0

    pairs.sort((a, b) => a.value - b.value)
    const totalWeight = pairs.reduce((s, p) => s + p.weight, 0)
    let cumulative = 0
    for (const p of pairs) {
      cumulative += p.weight
      if (cumulative >= totalWeight / 2) return p.value
    }
    return pairs[pairs.length - 1].value
  }

  // 计算某基数下的误差和（sum of absolute errors）
  const totalError = (
    coefficient: number,
    data: Array<{ actualPrice: number; multiplier: number; weightPower: number }>
  ): number => {
    let sum = 0
    for (const item of data) {
      const factor = item.multiplier * item.weightPower
      sum += Math.abs(coefficient * factor - item.actualPrice)
    }
    return sum
  }

  // 自动计算最优基数：每条按实际价格反推基数，取加权中位数（使误差和最小）
  const calculateOptimalCoefficient = () => {
    if (!selectedCrop || feedbackData.length === 0) return

    setIsCalculating(true)

    setTimeout(() => {
      try {
        const filteredData = getFilteredData()
        if (filteredData.length === 0) {
          setIsCalculating(false)
          setError('没有可用的数据')
          return
        }

        const processedData = filteredData.map(item => {
          const actualPrice = getActualPrice(item)
          const { totalMultiplier } = parseMutations(item.mutations)
          const weightPower = Math.pow(item.weight, 1.5)
          return { actualPrice, multiplier: totalMultiplier, weightPower }
        })

        const baseCoefficient = selectedCrop.priceCoefficient
        const optimalCoefficient = weightedMedianCoefficient(processedData)
        const bestCoefficient = Math.round(optimalCoefficient * 10000) / 10000

        const baseErrorSum = totalError(baseCoefficient, processedData)
        const bestErrorSum = totalError(bestCoefficient, processedData)
        const improvement = baseErrorSum > 0
          ? ((baseErrorSum - bestErrorSum) / baseErrorSum) * 100
          : 0

        if (improvement > 0) {
          setAdjustedCoefficient(bestCoefficient)
        } else {
          setAdjustedCoefficient(baseCoefficient)
        }
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

    const filteredData = getFilteredData()
    const cropData = filteredData.filter(item => item.crop_name === selectedCrop.name)
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
                    step="0.0001"
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
                      <span className="feedback-stat-label">调整后平均误差：</span>
                      <span className="feedback-stat-value">
                        {formatPrice(statistics.avgAdjustedError)}
                      </span>
                    </div>
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
            <>
              <div className="feedback-data-table-wrapper">
                <table className="feedback-data-table">
                  <thead>
                    <tr>
                      <th>操作</th>
                      <th>ID</th>
                      <th>作物</th>
                      <th>重量</th>
                      <th>突变倍数</th>
                      <th>计算价格</th>
                      <th>调整后价格</th>
                      <th>实际价格</th>
                      <th>误差</th>
                      <th className="feedback-th-accuracy">
                        <span>准确率</span>
                        <button
                          type="button"
                          className="feedback-sort-btn"
                          onClick={() => setAccuracySortOrder(prev => prev === null ? 'desc' : prev === 'desc' ? 'asc' : null)}
                          title={accuracySortOrder === 'desc' ? '按准确率从高到低（再点取消排序）' : accuracySortOrder === 'asc' ? '取消排序' : '按准确率排序'}
                        >
                          {accuracySortOrder === 'desc' ? '↓' : accuracySortOrder === 'asc' ? '↑' : '⇅'}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const list = getFilteredData().map((item) => {
                        const { totalMultiplier } = parseMutations(item.mutations)
                        const currentCoefficient = adjustedCoefficient ?? selectedCrop!.priceCoefficient
                        const { adjustedPrice, formattedAdjustedPrice } = calculateAdjustedPrice(item, currentCoefficient)
                        const actualPrice = getActualPrice(item)
                        const formattedAdjusted = formatPrice(adjustedPrice)
                        const formattedActual = formatPrice(actualPrice)
                        const adjustedError = formattedAdjusted === formattedActual ? 0 : Math.abs(adjustedPrice - actualPrice)
                        const adjustedAccuracy = actualPrice > 0 ? Math.max(0, (1 - adjustedError / actualPrice) * 100) : 0
                        const originalAccuracy = actualPrice > 0 ? Math.max(0, (1 - Math.abs(item.calculated_price - actualPrice) / actualPrice) * 100) : 0
                        const isAdjusted = adjustedCoefficient !== null && adjustedCoefficient !== selectedCrop!.priceCoefficient
                        const accuracyDiff = isAdjusted ? adjustedAccuracy - originalAccuracy : 0
                        return { item, totalMultiplier, formattedAdjustedPrice, actualPrice, adjustedError, adjustedAccuracy, accuracyDiff }
                      })
                      const sorted = accuracySortOrder === null
                        ? list
                        : [...list].sort((a, b) => accuracySortOrder === 'desc' ? b.adjustedAccuracy - a.adjustedAccuracy : a.adjustedAccuracy - b.adjustedAccuracy)
                      return sorted.map(({ item, totalMultiplier, formattedAdjustedPrice, actualPrice, adjustedError, adjustedAccuracy, accuracyDiff }) => (
                        <tr key={item.id}>
                          <td>
                            <button
                              className="feedback-delete-btn"
                              onClick={() => handleDeleteRecord(item.id)}
                              disabled={deletingIds.has(item.id)}
                              title="删除此记录（从数据库删除）"
                            >
                              {deletingIds.has(item.id) ? '…' : '×'}
                            </button>
                          </td>
                          <td>{item.id}</td>
                          <td>{item.crop_name}</td>
                          <td>{item.weight}kg</td>
                          <td>{totalMultiplier.toFixed(2)}×</td>
                          <td>{formatPrice(item.calculated_price)}</td>
                          <td>{formattedAdjustedPrice}</td>
                          <td>{formatPrice(actualPrice)}</td>
                          <td>{formatPrice(adjustedError)}</td>
                          <td className={adjustedAccuracy >= 95 ? 'accuracy-high' : adjustedAccuracy >= 90 ? 'accuracy-medium' : 'accuracy-low'}>
                            <span className="value-with-indicator">
                              <span className="value-text">{adjustedAccuracy.toFixed(2)}%</span>
                              {accuracyDiff !== 0 && (
                                <span className={accuracyDiff > 0 ? 'diff-improved' : 'diff-worsened'}>
                                  {accuracyDiff > 0 ? '+' : ''}{accuracyDiff.toFixed(2)}%
                                </span>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

