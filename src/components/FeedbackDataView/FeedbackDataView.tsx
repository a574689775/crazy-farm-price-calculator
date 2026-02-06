import { useState, useEffect, useMemo } from 'react'
import { supabase, type FeedbackData, deleteFeedback } from '@/utils/supabase'
import { crops } from '@/data/crops'
import { formatPrice, parseFormattedPrice, convertToYuan, roundedPriceToYuan } from '@/utils/priceCalculator'
import { getWeatherMutation } from '@/data/weatherMutations'
import type { CropConfig, WeatherMutation } from '@/types'
import { Modal } from '../Modal'
import './FeedbackDataView.css'

interface BatchOptimalRow {
  cropName: string
  defaultCoeff: number
  optimalCoeff: number
  sampleCount: number
  defaultAccuracy: number   // 默认基数下的平均准确率（%）
  optimalAccuracy: number  // 最优基数下的平均准确率（%）
  defaultError: number     // 默认基数下的平均误差
  optimalError: number     // 最优基数下的平均误差
  accuracyChange: number   // 调整后准确率 - 默认准确率（百分比）
  errorChange: number      // 默认平均误差 - 最优平均误差（正=误差下降，改善）
}

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
  const [isBatchCalculating, setIsBatchCalculating] = useState(false)
  const [batchResults, setBatchResults] = useState<BatchOptimalRow[]>([])
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchCopySuccess, setBatchCopySuccess] = useState(false)

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

  // 仅拉取全部反馈数据并返回，不写入 state（供「一键计算全部」使用）
  const fetchAllFeedbackForBatch = async (): Promise<FeedbackRecord[]> => {
    const { data, error: fetchError } = await supabase
      .from('price_feedback')
      .select('*')
      .order('created_at', { ascending: false })
    if (fetchError) throw fetchError
    return (data || []) as FeedbackRecord[]
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
    const defaultCoefficient = selectedCrop.priceCoefficient
    const actualPrices: number[] = []
    const adjustedPrices: number[] = []
    const originalPrices: number[] = []

    filteredData.forEach(item => {
      const actualPrice = getActualPrice(item)
      const { adjustedPrice } = calculateAdjustedPrice(item, currentCoefficient)
      const { adjustedPrice: originalPrice } = calculateAdjustedPrice(item, defaultCoefficient)
      actualPrices.push(actualPrice)
      adjustedPrices.push(adjustedPrice)
      originalPrices.push(originalPrice)
    })

    // 误差 = 计算值按显示单位四舍五入后与实际价格的差
    const adjustedErrors = adjustedPrices.map((adj, i) =>
      Math.abs(roundedPriceToYuan(adj) - actualPrices[i])
    )
    const originalErrors = originalPrices.map((orig, i) =>
      Math.abs(roundedPriceToYuan(orig) - actualPrices[i])
    )
    
    const avgAdjustedError = adjustedErrors.reduce((sum, err) => sum + err, 0) / adjustedErrors.length
    const avgOriginalError = originalErrors.reduce((sum, err) => sum + err, 0) / originalErrors.length

    // 准确率 = (1 - 误差/实际价格)*100，再求平均
    const originalAccuracies = originalErrors.map((err, i) =>
      actualPrices[i] > 0 ? Math.max(0, (1 - err / actualPrices[i]) * 100) : 0
    )
    const adjustedAccuracies = adjustedErrors.map((err, i) =>
      actualPrices[i] > 0 ? Math.max(0, (1 - err / actualPrices[i]) * 100) : 0
    )
    const avgOriginalAccuracy = originalAccuracies.reduce((s, a) => s + a, 0) / originalAccuracies.length
    const avgAdjustedAccuracy = adjustedAccuracies.reduce((s, a) => s + a, 0) / adjustedAccuracies.length

    return {
      avgAdjustedError,
      avgOriginalError,
      avgOriginalAccuracy,
      avgAdjustedAccuracy,
      improvement: avgOriginalError > 0 
        ? ((avgOriginalError - avgAdjustedError) / avgOriginalError) * 100 
        : 0
    }
  }, [selectedCrop, feedbackData, adjustedCoefficient])

  // 使用新误差定义：计算值四舍五入到单位后与实际价格的误差和
  const totalErrorRounded = (
    coefficient: number,
    data: Array<{ actualPrice: number; multiplier: number; weightPower: number }>
  ): number => {
    let sum = 0
    for (const item of data) {
      const factor = item.multiplier * item.weightPower
      const calculated = coefficient * factor
      sum += Math.abs(roundedPriceToYuan(calculated) - item.actualPrice)
    }
    return sum
  }

  // 根据 processedData 和基数，计算平均误差（与 totalErrorRounded 一致，返回平均值）
  const avgError = (
    coefficient: number,
    data: Array<{ actualPrice: number; multiplier: number; weightPower: number }>
  ): number => {
    if (data.length === 0) return 0
    const sum = totalErrorRounded(coefficient, data)
    return sum / data.length
  }

  // 根据 processedData 和基数，计算平均准确率（与统计区一致）
  const avgAccuracy = (
    coefficient: number,
    data: Array<{ actualPrice: number; multiplier: number; weightPower: number }>
  ): number => {
    if (data.length === 0) return 0
    let sum = 0
    let count = 0
    for (const item of data) {
      if (item.actualPrice <= 0) continue
      const factor = item.multiplier * item.weightPower
      const err = Math.abs(roundedPriceToYuan(coefficient * factor) - item.actualPrice)
      sum += Math.max(0, (1 - err / item.actualPrice) * 100)
      count++
    }
    return count > 0 ? sum / count : 0
  }

  // 给定 processedData 和默认基数，网格搜索返回最优基数（纯函数，供单作物与批量使用）
  const gridSearchOptimal = (
    processedData: Array<{ actualPrice: number; multiplier: number; weightPower: number }>,
    baseCoefficient: number
  ): number => {
    const reversed = processedData
      .map(item => {
        const factor = item.multiplier * item.weightPower
        if (factor <= 0 || item.actualPrice <= 0) return null
        return item.actualPrice / factor
      })
      .filter((c): c is number => c !== null)
    if (reversed.length === 0) return baseCoefficient
    const cMin = Math.min(...reversed)
    const cMax = Math.max(...reversed)
    const padding = Math.max((cMax - cMin) * 0.2, 0.01)
    const low = Math.max(0, cMin - padding)
    const high = cMax + padding
    const steps = 800
    let bestC = baseCoefficient
    let bestSum = totalErrorRounded(baseCoefficient, processedData)
    for (let i = 0; i <= steps; i++) {
      const c = low + (high - low) * (i / steps)
      const sum = totalErrorRounded(c, processedData)
      if (sum < bestSum) {
        bestSum = sum
        bestC = c
      }
    }
    return Math.round(bestC * 10000) / 10000
  }

  // 一键计算全部作物最优基数，并展示结果列表（始终用全部反馈数据，与当前是否筛选作物无关）
  const runBatchOptimalCalculation = async () => {
    setIsBatchCalculating(true)
    setBatchResults([])
    setShowBatchModal(false)
    try {
      const allData = await fetchAllFeedbackForBatch()
      const results: BatchOptimalRow[] = []
      for (const crop of crops) {
        const cropRecords = allData.filter(item => item.crop_name === crop.name)
        if (cropRecords.length === 0) continue
        const processedData = cropRecords.map(item => {
          const actualPrice = getActualPrice(item)
          const { totalMultiplier } = parseMutations(item.mutations)
          const weightPower = Math.pow(item.weight, 1.5)
          return { actualPrice, multiplier: totalMultiplier, weightPower }
        })
        const optimalCoeff = gridSearchOptimal(processedData, crop.priceCoefficient)
        const accDefault = avgAccuracy(crop.priceCoefficient, processedData)
        const accOptimal = avgAccuracy(optimalCoeff, processedData)
        const errDefault = avgError(crop.priceCoefficient, processedData)
        const errOptimal = avgError(optimalCoeff, processedData)
        results.push({
          cropName: crop.name,
          defaultCoeff: crop.priceCoefficient,
          optimalCoeff,
          sampleCount: cropRecords.length,
          defaultAccuracy: accDefault,
          optimalAccuracy: accOptimal,
          defaultError: errDefault,
          optimalError: errOptimal,
          accuracyChange: accOptimal - accDefault,
          errorChange: errDefault - errOptimal, // 正=误差下降
        })
      }
      setBatchResults(results)
      setBatchCopySuccess(false)
      setShowBatchModal(true)
    } catch (err) {
      console.error('批量计算最优基数失败:', err)
      setError('批量计算失败')
    } finally {
      setIsBatchCalculating(false)
    }
  }

  // 自动计算最优基数：在新误差定义下使误差和最小（网格搜索）
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
        const bestCoefficient = gridSearchOptimal(processedData, baseCoefficient)

        const baseErrorSum = totalErrorRounded(baseCoefficient, processedData)
        const bestErrorSum = totalErrorRounded(bestCoefficient, processedData)
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
          <div className="feedback-actions-row">
            {selectedCrop && (
              <button className="feedback-clear-filter" onClick={handleClearFilter}>
                清除筛选
              </button>
            )}
            <button
              className="feedback-clear-filter"
              onClick={runBatchOptimalCalculation}
              disabled={isBatchCalculating || feedbackData.length === 0}
            >
              {isBatchCalculating ? '计算中...' : '一键计算全部最优基数'}
            </button>
          </div>
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
                  <div className="feedback-stats-grid">
                    <div className="feedback-stats-col">
                      <div className="feedback-stat-item">
                        <span className="feedback-stat-label">平均误差：</span>
                        <span className="feedback-stat-value">
                          {formatPrice(statistics.avgOriginalError)}
                        </span>
                      </div>
                      <div className="feedback-stat-item">
                        <span className="feedback-stat-label">调整后平均误差：</span>
                        <span className={`feedback-stat-value ${(adjustedCoefficient != null && adjustedCoefficient !== selectedCrop.priceCoefficient) ? (statistics.avgAdjustedError < statistics.avgOriginalError ? 'accurate' : 'inaccurate') : ''}`}>
                          {formatPrice(statistics.avgAdjustedError)}
                        </span>
                      </div>
                      <div className="feedback-stat-item">
                        <span className="feedback-stat-label">误差调整的差值：</span>
                        <span className={`feedback-stat-value ${(adjustedCoefficient != null && adjustedCoefficient !== selectedCrop.priceCoefficient) ? ((statistics.avgAdjustedError - statistics.avgOriginalError) <= 0 ? 'accurate' : 'inaccurate') : ''}`}>
                          {(statistics.avgAdjustedError - statistics.avgOriginalError) >= 0 ? '' : '-'}{formatPrice(Math.abs(statistics.avgAdjustedError - statistics.avgOriginalError))}
                        </span>
                      </div>
                    </div>
                    <div className="feedback-stats-col">
                      <div className="feedback-stat-item">
                        <span className="feedback-stat-label">准确率：</span>
                        <span className="feedback-stat-value">
                          {statistics.avgOriginalAccuracy.toFixed(2)}%
                        </span>
                      </div>
                      <div className="feedback-stat-item">
                        <span className="feedback-stat-label">调整后准确率：</span>
                        <span className={`feedback-stat-value ${(adjustedCoefficient != null && adjustedCoefficient !== selectedCrop.priceCoefficient) ? (statistics.avgAdjustedAccuracy >= statistics.avgOriginalAccuracy ? 'accurate' : 'inaccurate') : ''}`}>
                          {statistics.avgAdjustedAccuracy.toFixed(2)}%
                        </span>
                      </div>
                      <div className="feedback-stat-item">
                        <span className="feedback-stat-label">准确率调整的差值：</span>
                        <span className={`feedback-stat-value ${(adjustedCoefficient != null && adjustedCoefficient !== selectedCrop.priceCoefficient) ? (statistics.avgAdjustedAccuracy - statistics.avgOriginalAccuracy > 0 ? 'accurate' : statistics.avgAdjustedAccuracy - statistics.avgOriginalAccuracy < 0 ? 'inaccurate' : '') : ''}`}>
                          {statistics.avgAdjustedAccuracy - statistics.avgOriginalAccuracy >= 0 ? '+' : ''}{(statistics.avgAdjustedAccuracy - statistics.avgOriginalAccuracy).toFixed(2)}%
                        </span>
                      </div>
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
                        // 误差 = 计算值按显示单位四舍五入后与实际价格的差（准确/不准确统一）
                        const adjustedError = Math.abs(roundedPriceToYuan(adjustedPrice) - actualPrice)
                        const adjustedAccuracy = actualPrice > 0 ? Math.max(0, (1 - adjustedError / actualPrice) * 100) : 0
                        return { item, totalMultiplier, formattedAdjustedPrice, actualPrice, adjustedError, adjustedAccuracy }
                      })
                      const sorted = accuracySortOrder === null
                        ? list
                        : [...list].sort((a, b) => accuracySortOrder === 'desc' ? b.adjustedAccuracy - a.adjustedAccuracy : a.adjustedAccuracy - b.adjustedAccuracy)
                      return sorted.map(({ item, totalMultiplier, formattedAdjustedPrice, actualPrice, adjustedError, adjustedAccuracy }) => (
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
                            {adjustedAccuracy.toFixed(2)}%
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

      <Modal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="全部作物最优基数"
        contentClassName="feedback-batch-modal-content"
      >
        <div className="feedback-batch-result">
          {batchResults.length === 0 ? (
            <p className="feedback-batch-empty">暂无有反馈数据的作物</p>
          ) : (
            <>
              <div className="feedback-batch-copy-row">
                <button
                  type="button"
                  className="feedback-batch-copy"
                  onClick={() => {
                    const text = batchResults.map(r => `${r.cropName} ${r.optimalCoeff}`).join('\n')
                    navigator.clipboard
                      .writeText(text)
                      .then(() => {
                        setBatchCopySuccess(true)
                        setError('')
                        setTimeout(() => setBatchCopySuccess(false), 2000)
                      })
                      .catch(() => setError('复制失败'))
                  }}
                >
                  一键复制最优基数（作物+基数）
                </button>
                {batchCopySuccess && <span className="feedback-batch-copy-ok">已复制到剪贴板</span>}
              </div>
              <table className="feedback-batch-table">
                <thead>
                  <tr>
                    <th>作物</th>
                    <th>默认基数</th>
                    <th>最优基数</th>
                    <th>反馈数</th>
                    <th>准确率</th>
                    <th>调整后准确率</th>
                    <th>平均误差</th>
                    <th>调整后平均误差</th>
                    <th>准确率变化</th>
                    <th>误差变化</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map(row => (
                    <tr key={row.cropName}>
                      <td>{row.cropName}</td>
                      <td>{row.defaultCoeff}</td>
                      <td>{row.optimalCoeff}</td>
                      <td>{row.sampleCount}</td>
                      <td>{row.defaultAccuracy.toFixed(2)}%</td>
                      <td className={row.optimalAccuracy > row.defaultAccuracy ? 'feedback-batch-acc-up' : row.optimalAccuracy < row.defaultAccuracy ? 'feedback-batch-acc-down' : ''}>
                        {row.optimalAccuracy.toFixed(2)}%
                      </td>
                      <td>{row.defaultError.toFixed(2)}</td>
                      <td className={row.optimalError < row.defaultError ? 'feedback-batch-acc-up' : row.optimalError > row.defaultError ? 'feedback-batch-acc-down' : ''}>
                        {row.optimalError.toFixed(2)}
                      </td>
                      <td className={row.accuracyChange > 0 ? 'feedback-batch-acc-up' : row.accuracyChange < 0 ? 'feedback-batch-acc-down' : ''}>
                        {row.accuracyChange >= 0 ? '+' : ''}{row.accuracyChange.toFixed(2)}%
                      </td>
                      <td className={row.errorChange > 0 ? 'feedback-batch-acc-up' : row.errorChange < 0 ? 'feedback-batch-acc-down' : ''}>
                        {row.errorChange >= 0 ? '-' : '+'}{Math.abs(row.errorChange).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

