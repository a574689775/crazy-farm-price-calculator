import { useState, useEffect, useRef } from 'react'
import type { CropConfig, HistoryRecord, WeatherMutation } from '@/types'
import { crops } from '@/data/crops'
import { Footer } from '@/components/Footer'
import { CropSelector } from '@/components/CropSelector'
import { PriceCalculator } from '@/components/PriceCalculator'
import { HistoryView } from '@/components/HistoryView'
import { FeedbackDataView } from '@/components/FeedbackDataView'
import { parseShareUrl } from '@/utils/shareEncoder'
import { logCropQuery, fetchTodayQueryCounts } from '@/utils/supabase'
import './App.css'

type Page = 'selector' | 'calculator' | 'feedback'
interface PrefillData {
  weight: number
  mutations: WeatherMutation[]
}

export const App = () => {
  const [selectedCrop, setSelectedCrop] = useState<CropConfig | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('selector')
  const [showHistory, setShowHistory] = useState(false)
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null)
  const [todayQueryCounts, setTodayQueryCounts] = useState<Record<string, number>>({})
  const selectorFetchLockRef = useRef(false)
  const selectorFetchTimerRef = useRef<number | null>(null)

  // 统一的动画时长（与 CSS transform 过渡一致）
  const ANIMATION_DURATION = 300

  // 关闭计算器时延迟清空数据，保证动画正常播放
  const clearTimer = useRef<number | null>(null)
  const clearCalculatorState = () => {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current)
    }
    clearTimer.current = window.setTimeout(() => {
      setSelectedCrop(null)
      setPrefillData(null)
      clearTimer.current = null
    }, ANIMATION_DURATION)
  }

  // 取消待清理，避免快速前进/后退时被错误清空
  const cancelClearCalculatorState = () => {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current)
      clearTimer.current = null
    }
  }

  // 根据 URL 同步状态（统一的状态恢复函数）
  const syncStateFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const page = urlParams.get('page')
    const cropName = urlParams.get('crop')
    
    // 检查是否是历史记录页面
    const isHistory = page === 'history'
    setShowHistory(isHistory)
    
    if (cropName) {
      // 从 URL 恢复作物和页面状态
      const crop = crops.find(c => c.name === cropName)
      if (crop) {
        cancelClearCalculatorState()
        setSelectedCrop(crop)
        // 立即设置页面状态，不使用延迟
        setCurrentPage('calculator')
      } else {
        // 如果找不到作物，返回选择页面
          setCurrentPage('selector')
          clearCalculatorState()
      }
    } else {
      // 没有作物参数，关闭计算器页面
        setCurrentPage('selector')
        clearCalculatorState()
    }
  }

  // 标记是否已初始化，避免首次加载时重复请求
  const isInitializedRef = useRef(false)

  // 从URL参数恢复配置（仅在首次加载时）
  useEffect(() => {
    // 检查是否是反馈数据页面
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('page') === 'feedback') {
      setCurrentPage('feedback')
      isInitializedRef.current = true
      return
    }

    // 检查是否有分享链接参数
    const shareData = parseShareUrl()
    if (shareData && shareData.cropIndex < crops.length) {
      const sharedCrop = crops[shareData.cropIndex]
      cancelClearCalculatorState()
      setSelectedCrop(sharedCrop)
      setCurrentPage('calculator')
      // 更新 URL 为作物参数格式，支持浏览器前进/后退
      const url = new URL(window.location.href)
      url.searchParams.set('crop', sharedCrop.name)
      window.history.replaceState({ page: 'calculator', crop: sharedCrop.name }, '', url.toString())
      isInitializedRef.current = true
      return
    }

    // 使用统一的状态恢复函数
    syncStateFromUrl()
    isInitializedRef.current = true
  }, [])

  // 每次进入选择页时静默刷新当日查询次数（以 URL 为准：无 page 且无 crop 参数）
  useEffect(() => {
    // 清理可能存在的延迟请求
    if (selectorFetchTimerRef.current) {
      clearTimeout(selectorFetchTimerRef.current)
      selectorFetchTimerRef.current = null
    }

    if (currentPage !== 'selector' || showHistory) {
      selectorFetchLockRef.current = false
      return
    }

    const params = new URLSearchParams(window.location.search)
    const page = params.get('page')
    const cropParam = params.get('crop')
    const isSelectorUrl = !cropParam && (page === null || page === 'selector')

    if (isSelectorUrl && isInitializedRef.current && !selectorFetchLockRef.current) {
      selectorFetchLockRef.current = true
      selectorFetchTimerRef.current = window.setTimeout(() => {
        fetchTodayQueryCounts()
          .then(setTodayQueryCounts)
          .catch(console.error)
      }, 350) // 略大于动画时长，确保动画完成后再更新

      return () => {
        if (selectorFetchTimerRef.current) {
          clearTimeout(selectorFetchTimerRef.current)
          selectorFetchTimerRef.current = null
        }
        selectorFetchLockRef.current = false
      }
    }
  }, [currentPage, showHistory, selectedCrop])

  const handleSelectCrop = (crop: CropConfig) => {
    // 更新 URL，添加作物参数，支持浏览器前进/后退
    // 如果历史记录页面已经打开，保留 page=history 参数
    const url = new URL(window.location.href)
    url.searchParams.set('crop', crop.name)
    // 从当前 URL 检查历史记录状态，如果已经打开则保留
    if (url.searchParams.get('page') === 'history' || showHistory) {
      url.searchParams.set('page', 'history')
    }
    window.history.pushState({ page: 'calculator', crop: crop.name }, '', url.toString())
    
    // 立即更新状态
    cancelClearCalculatorState()
    setSelectedCrop(crop)
    setCurrentPage('calculator')

    // 记录查询次数（异步，不阻塞 UI）
    logCropQuery(crop.name).catch(console.error)
  }

  const handleBackToSelector = () => {
    // 更新 URL
    const url = new URL(window.location.href)
    url.searchParams.delete('crop')
    url.searchParams.delete('s')
    // 如果历史记录打开，保留 page=history，否则清除所有参数
    if (showHistory) {
      url.searchParams.set('page', 'history')
    } else {
      url.search = ''
    }
    window.history.pushState({ page: showHistory ? 'history' : 'selector' }, '', url.toString())
    
    // 立即更新状态，动画结束后再清空数据
    setCurrentPage('selector')
    clearCalculatorState()
    // 数据刷新由 useEffect 统一处理，避免重复请求
  }

  const handleShowHistory = () => {
    // 更新 URL，添加历史记录参数，支持浏览器前进/后退
    const url = new URL(window.location.href)
    url.searchParams.set('page', 'history')
    // 如果当前有作物参数，保留它
    window.history.pushState({ page: 'history' }, '', url.toString())
    
    // 立即更新状态
    setShowHistory(true)
  }

  const handleBackFromHistory = () => {
    // 更新 URL
    const url = new URL(window.location.href)
    url.searchParams.delete('page')
    // 如果有作物参数，也清除（因为返回选择页面）
    url.searchParams.delete('crop')
    url.searchParams.delete('s')
    window.history.pushState({ page: 'selector' }, '', url.toString())
    
    // 立即更新状态
    setShowHistory(false)
    setCurrentPage('selector')
    clearCalculatorState()
    // 数据刷新由 useEffect 统一处理，避免重复请求
  }

  const handleSelectHistoryRecord = (record: HistoryRecord) => {
    const crop = crops.find(c => c.name === record.cropName)
    if (!crop) return

    // 从历史记录选择作物时，保留 page=history 参数，同时添加 crop 参数
    const url = new URL(window.location.href)
    url.searchParams.set('page', 'history')
    url.searchParams.set('crop', crop.name)
    window.history.pushState({ page: 'history', crop: crop.name }, '', url.toString())

    // 立即更新状态
    cancelClearCalculatorState()
    setSelectedCrop(crop)
    setPrefillData({
      weight: record.weight,
      mutations: record.mutations,
    })
    setCurrentPage('calculator')

    // 记录查询次数（异步，不阻塞 UI）
    logCropQuery(crop.name).catch(console.error)
  }

  // 监听浏览器前进/后退
  useEffect(() => {
    const handlePopState = () => {
      // 立即同步状态，不使用延迟
      syncStateFromUrl()
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
      // 清理可能存在的定时器
      if (clearTimer.current) {
        clearTimeout(clearTimer.current)
      }
    }
  }, [])

  return (
    <div className="app">
      <main className={`main ${currentPage === 'feedback' ? 'feedback-mode' : ''}`}>
        {currentPage === 'feedback' ? (
          <FeedbackDataView />
        ) : (
          <div className={`content-container ${currentPage === 'calculator' ? 'calculator-active' : ''}`}>
            {/* 选择作物页面 - 始终渲染，通过transform控制位置 */}
            <div className="page-wrapper page-selector">
              <CropSelector
                crops={crops}
                selectedCrop={selectedCrop}
                onSelectCrop={handleSelectCrop}
                onShowHistory={handleShowHistory}
                queryCounts={todayQueryCounts}
              />
              <Footer />
            </div>
            
            {/* 历史记录页面 - 始终渲染，通过transform控制位置 */}
            <div className={`page-wrapper page-history ${showHistory ? 'active' : ''}`}>
              <HistoryView
                onBack={handleBackFromHistory}
                active={showHistory}
                onSelectRecord={handleSelectHistoryRecord}
              />
            </div>
            
            {/* 计算器页面 - 始终渲染，通过transform控制位置 */}
            <div className={`page-wrapper page-calculator ${currentPage === 'calculator' && selectedCrop ? 'active' : ''}`}>
              <PriceCalculator
                crop={selectedCrop}
                onBack={handleBackToSelector}
                prefillData={prefillData ?? undefined}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
