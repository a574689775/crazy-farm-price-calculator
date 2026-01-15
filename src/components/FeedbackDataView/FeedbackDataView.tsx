import { useState, useEffect, useMemo } from 'react'
import { supabase, type FeedbackData } from '@/utils/supabase'
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
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set())

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
    setDeletedIds(new Set()) // 清除删除记录
    fetchFeedbackData(crop.name)
  }

  // 清除筛选
  const handleClearFilter = () => {
    setSelectedCrop(null)
    setAdjustedCoefficient(null)
    setDeletedIds(new Set()) // 清除删除记录
    fetchFeedbackData()
  }

  // 删除记录（仅前端隐藏）
  const handleDeleteRecord = (id: number) => {
    setDeletedIds(prev => new Set([...prev, id]))
  }

  // 恢复删除的记录
  const handleRestoreRecord = (id: number) => {
    setDeletedIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }

  // 获取过滤后的数据（排除已删除的记录）
  const getFilteredData = () => {
    return feedbackData.filter(item => !deletedIds.has(item.id))
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
  }, [selectedCrop, feedbackData, adjustedCoefficient, deletedIds])

  // 计算给定系数下的平均误差
  const calculateAverageError = (
    coefficient: number,
    data: Array<{ actualPrice: number; multiplier: number; weightPower: number }>
  ): number => {
    let totalError = 0
    for (const item of data) {
      const calculatedPrice = coefficient * item.multiplier * item.weightPower
      const error = Math.abs(calculatedPrice - item.actualPrice)
      totalError += error
    }
    return totalError / data.length
  }

  // 使用最小二乘法计算最优系数
  // 公式：coefficient = Σ(price * multiplier * weightPower) / Σ((multiplier * weightPower)^2)
  const calculateCoefficientByLeastSquares = (
    data: Array<{ actualPrice: number; multiplier: number; weightPower: number }>
  ): number => {
    let numerator = 0  // Σ(price * multiplier * weightPower)
    let denominator = 0  // Σ((multiplier * weightPower)^2)

    for (const item of data) {
      const factor = item.multiplier * item.weightPower
      numerator += item.actualPrice * factor
      denominator += factor * factor
    }

    if (denominator === 0) {
      return 0
    }

    return numerator / denominator
  }

  // 去除异常值（使用IQR方法）
  const removeOutliers = (
    coefficients: number[]
  ): number[] => {
    if (coefficients.length < 4) {
      return coefficients  // 数据太少，不进行异常值检测
    }

    const sorted = [...coefficients].sort((a, b) => a - b)
    const q1Index = Math.floor(sorted.length * 0.25)
    const q3Index = Math.floor(sorted.length * 0.75)
    const q1 = sorted[q1Index]
    const q3 = sorted[q3Index]
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    return coefficients.filter(coeff => coeff >= lowerBound && coeff <= upperBound)
  }

  // 自动计算最优基数：使用最小二乘法 + 异常值处理
  const calculateOptimalCoefficient = () => {
    if (!selectedCrop || feedbackData.length === 0) return

    setIsCalculating(true)

    // 使用 setTimeout 让 UI 有机会更新
    setTimeout(() => {
      try {
        // 获取过滤后的数据（排除已删除的记录）
        const filteredData = getFilteredData()
        
        if (filteredData.length === 0) {
          setIsCalculating(false)
          setError('没有可用的数据')
          return
        }

        // 预处理数据
        const processedData = filteredData.map(item => {
          const actualPrice = getActualPrice(item)
          const { totalMultiplier } = parseMutations(item.mutations)
          const weightPower = Math.pow(item.weight, 1.5)
          return {
            actualPrice,
            multiplier: totalMultiplier,
            weightPower
          }
        })

        const baseCoefficient = selectedCrop.priceCoefficient

        // 方法1：使用最小二乘法（最科学的方法）
        const leastSquaresCoefficient = calculateCoefficientByLeastSquares(processedData)
        
        // 方法2：反推系数后去除异常值，再取中位数（对异常值更鲁棒）
        const reversedCoefficients = processedData
          .map(item => {
            const factor = item.multiplier * item.weightPower
            if (factor > 0 && item.actualPrice > 0) {
              return item.actualPrice / factor
            }
            return null
          })
          .filter((coeff): coeff is number => coeff !== null)
        
        const cleanedCoefficients = removeOutliers(reversedCoefficients)
        const medianCoefficient = cleanedCoefficients.length > 0
          ? cleanedCoefficients.sort((a, b) => a - b)[Math.floor(cleanedCoefficients.length / 2)]
          : baseCoefficient

        // 比较两种方法，选择误差更小的
        const lsError = calculateAverageError(leastSquaresCoefficient, processedData)
        const medianError = calculateAverageError(medianCoefficient, processedData)
        const baseError = calculateAverageError(baseCoefficient, processedData)

        let bestCoefficient = lsError < medianError ? leastSquaresCoefficient : medianCoefficient
        let minError = Math.min(lsError, medianError)

        // 如果两种方法都不如原始基数，使用原始基数
        if (baseError < minError) {
          bestCoefficient = baseCoefficient
          minError = baseError
        }

        // 保留2位小数
        bestCoefficient = Math.round(bestCoefficient * 100) / 100
        
        const improvement = ((baseError - minError) / baseError) * 100
        
        console.log('自动计算结果:', {
          原始基数: baseCoefficient,
          最小二乘法系数: leastSquaresCoefficient.toFixed(2),
          中位数系数: medianCoefficient.toFixed(2),
          最优基数: bestCoefficient,
          原始平均误差: baseError.toFixed(2),
          最小二乘法误差: lsError.toFixed(2),
          中位数误差: medianError.toFixed(2),
          最优平均误差: minError.toFixed(2),
          改善: improvement.toFixed(2) + '%',
          样本数量: processedData.length,
          去除异常值后数量: cleanedCoefficients.length
        })
        
        // 只要有改善就更新（即使很小）
        if (improvement > 0) {
          setAdjustedCoefficient(bestCoefficient)
        } else {
          // 如果没有改善，保持当前基数
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
            <>
              {deletedIds.size > 0 && (
                <div className="feedback-deleted-info">
                  <span>已隐藏 {deletedIds.size} 条记录</span>
                  <button 
                    className="feedback-restore-all"
                    onClick={() => setDeletedIds(new Set())}
                  >
                    恢复全部
                  </button>
                </div>
              )}
              <div className="feedback-data-table-wrapper">
                <table className="feedback-data-table">
                  <thead>
                    <tr>
                      <th>操作</th>
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
                    {getFilteredData().map((item) => {
                    const { totalMultiplier } = parseMutations(item.mutations)
                    const currentCoefficient = adjustedCoefficient ?? selectedCrop!.priceCoefficient
                    const { adjustedPrice, formattedAdjustedPrice } = calculateAdjustedPrice(item, currentCoefficient)
                    const actualPrice = getActualPrice(item)
                    
                    // 计算原始误差和准确率
                    const originalError = Math.abs(item.calculated_price - actualPrice)
                    const originalAccuracy = actualPrice > 0 
                      ? Math.max(0, (1 - originalError / actualPrice) * 100) 
                      : 0
                    
                    // 计算调整后误差和准确率
                    const adjustedError = Math.abs(adjustedPrice - actualPrice)
                    const adjustedAccuracy = actualPrice > 0 
                      ? Math.max(0, (1 - adjustedError / actualPrice) * 100) 
                      : 0
                    
                    // 判断改善情况（只有调整了基数时才显示差值）
                    const isAdjusted = adjustedCoefficient !== null && adjustedCoefficient !== selectedCrop!.priceCoefficient
                    const accuracyDiff = isAdjusted ? adjustedAccuracy - originalAccuracy : 0

                    return (
                      <tr key={item.id}>
                        <td>
                          <button
                            className="feedback-delete-btn"
                            onClick={() => handleDeleteRecord(item.id)}
                            title="删除此记录（仅前端隐藏）"
                          >
                            ×
                          </button>
                        </td>
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
                            {isAdjusted && accuracyDiff !== 0 && (
                              <span className={accuracyDiff > 0 ? 'diff-improved' : 'diff-worsened'}>
                                {accuracyDiff > 0 ? '+' : ''}{accuracyDiff.toFixed(2)}%
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {deletedIds.size > 0 && feedbackData.filter(item => deletedIds.has(item.id)).map((item) => {
                    const { totalMultiplier } = parseMutations(item.mutations)
                    const currentCoefficient = adjustedCoefficient ?? selectedCrop!.priceCoefficient
                    const { adjustedPrice, formattedAdjustedPrice } = calculateAdjustedPrice(item, currentCoefficient)
                    const actualPrice = getActualPrice(item)
                    const adjustedError = Math.abs(adjustedPrice - actualPrice)
                    const adjustedAccuracy = actualPrice > 0 
                      ? Math.max(0, (1 - adjustedError / actualPrice) * 100) 
                      : 0

                    return (
                      <tr key={item.id} className="feedback-deleted-row">
                        <td>
                          <button
                            className="feedback-restore-btn"
                            onClick={() => handleRestoreRecord(item.id)}
                            title="恢复此记录"
                          >
                            恢复
                          </button>
                        </td>
                        <td>{item.crop_name}</td>
                        <td>{item.weight}kg</td>
                        <td>{totalMultiplier.toFixed(2)}×</td>
                        <td>{formatPrice(item.calculated_price)}</td>
                        <td>{formattedAdjustedPrice}</td>
                        <td>{formatPrice(actualPrice)}</td>
                        <td>{formatPrice(adjustedError)}</td>
                        <td>{adjustedAccuracy.toFixed(2)}%</td>
                      </tr>
                    )
                  })}
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

