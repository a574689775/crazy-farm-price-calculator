import { useState, useEffect, useRef } from 'react'
import type { CropConfig, HistoryRecord, WeatherMutation } from '@/types'
import { crops } from '@/data/crops'
import { Footer } from '@/components/Footer'
import { CropSelector } from '@/components/CropSelector'
import { PriceCalculator } from '@/components/PriceCalculator'
import { HistoryView } from '@/components/HistoryView'
import { FeedbackDataView } from '@/components/FeedbackDataView'
import { Login } from '@/components/Login'
import { parseShareUrl } from '@/utils/shareEncoder'
import { logCropQuery, subscribeCropDailyStats, getSession, onAuthStateChange, useFreeQuery, getMySubscription } from '@/utils/supabase'
import type { MySubscription } from '@/utils/supabase'
import { Modal } from '@/components/Modal'
import './App.css'

const ALLOWED_HOST = 'fknc.top'

type Page = 'selector' | 'calculator' | 'feedback'
interface PrefillData {
  weight: number
  mutations: WeatherMutation[]
}

const isAllowedDomain = (): boolean => {
  if (typeof window === 'undefined') return true
  const h = window.location.hostname
  return (
    h === ALLOWED_HOST ||
    h === `www.${ALLOWED_HOST}` ||
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0'
  )
}

export const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [selectedCrop, setSelectedCrop] = useState<CropConfig | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('selector')
  const [showHistory, setShowHistory] = useState(false)
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null)
  const [todayQueryCounts, setTodayQueryCounts] = useState<Record<string, number>>({})
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showPaywallModal, setShowPaywallModal] = useState(false)
  const [subscriptionState, setSubscriptionState] = useState<MySubscription | null>(null)

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
  // 从选择页点击进入计算器时已做过免费次数校验，避免重复扣减；从 URL/分享链接进入时未做，需在 effect 中补检
  const calculatorEntryCheckedRef = useRef(false)

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession()
      setIsAuthenticated(!!session)
    }
    checkAuth()

    // 监听认证状态变化
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 登录成功回调
  const handleLoginSuccess = async () => {
    const session = await getSession()
    setIsAuthenticated(!!session)
  }

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

  // 登录后拉取会员状态（服务端判断是否有效，换设备同步）
  useEffect(() => {
    if (!isAuthenticated) {
      setSubscriptionState(null)
      return
    }
    getMySubscription().then(setSubscriptionState)
  }, [isAuthenticated])

  // 从 URL/分享链接直接进入计算器时补做免费次数校验，防止绕过选择页白嫖
  useEffect(() => {
    if (
      currentPage !== 'calculator' ||
      !selectedCrop ||
      !isAuthenticated ||
      subscriptionState === null ||
      subscriptionState.isActive ||
      calculatorEntryCheckedRef.current
    ) {
      return
    }
    let cancelled = false
    useFreeQuery().then(({ allowed }) => {
      if (cancelled) return
      calculatorEntryCheckedRef.current = true
      if (!allowed) {
        setShowPaywallModal(true)
        setCurrentPage('selector')
        clearCalculatorState()
        const url = new URL(window.location.href)
        url.searchParams.delete('crop')
        url.searchParams.delete('s')
        window.history.replaceState({ page: 'selector' }, '', url.toString())
      }
    }).catch((e) => {
      if (!cancelled) {
        console.error('useFreeQuery failed (URL entry)', e)
        setShowPaywallModal(true)
        setCurrentPage('selector')
        clearCalculatorState()
      }
    })
    return () => { cancelled = true }
  }, [currentPage, selectedCrop, isAuthenticated, subscriptionState])

  const refreshSubscription = () => {
    if (isAuthenticated) getMySubscription().then(setSubscriptionState)
  }

  // 登录后一直订阅当日作物热度（Supabase Realtime），有变更即更新；订阅时会先拉一次当日数据
  useEffect(() => {
    if (!isAuthenticated) return
    const unsubscribe = subscribeCropDailyStats(setTodayQueryCounts)
    return () => unsubscribe()
  }, [isAuthenticated])

  const handleSelectCrop = async (crop: CropConfig) => {
    if (subscriptionState?.isActive) {
      calculatorEntryCheckedRef.current = true
      doOpenCalculator(crop, null)
      logCropQuery(crop.name).catch(console.error)
      return
    }
    try {
      const { allowed } = await useFreeQuery()
      if (!allowed) {
        setShowPaywallModal(true)
        return
      }
      calculatorEntryCheckedRef.current = true
      doOpenCalculator(crop, null)
      logCropQuery(crop.name).catch(console.error)
    } catch (e) {
      console.error('useFreeQuery failed', e)
      setShowPaywallModal(true)
    }
  }

  const doOpenCalculator = (crop: CropConfig, prefill: PrefillData | null) => {
    const url = new URL(window.location.href)
    url.searchParams.set('crop', crop.name)
    if (url.searchParams.get('page') === 'history' || showHistory) {
      url.searchParams.set('page', 'history')
    }
    window.history.pushState({ page: 'calculator', crop: crop.name }, '', url.toString())
    cancelClearCalculatorState()
    setSelectedCrop(crop)
    setPrefillData(prefill ?? null)
    setCurrentPage('calculator')
  }

  const handleBackToSelector = () => {
    calculatorEntryCheckedRef.current = false
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

  const handleSelectHistoryRecord = async (record: HistoryRecord) => {
    const crop = crops.find(c => c.name === record.cropName)
    if (!crop) return

    const prefill = { weight: record.weight, mutations: record.mutations }
    if (subscriptionState?.isActive) {
      calculatorEntryCheckedRef.current = true
      doOpenCalculator(crop, prefill)
      logCropQuery(crop.name).catch(console.error)
      return
    }
    try {
      const { allowed } = await useFreeQuery()
      if (!allowed) {
        setShowPaywallModal(true)
        return
      }
      calculatorEntryCheckedRef.current = true
      doOpenCalculator(crop, prefill)
      logCropQuery(crop.name).catch(console.error)
    } catch (e) {
      console.error('useFreeQuery failed', e)
      setShowPaywallModal(true)
    }
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

  // 非 fknc.top 域名时全屏提醒（域名迁移通知）
  if (!isAllowedDomain()) {
    return (
      <div className="app domain-reminder">
        <div className="domain-reminder__card">
          <h1 className="domain-reminder__title">域名迁移与旧域名下线通知</h1>
          <p className="domain-reminder__para">
            为提供更稳定的服务体验，我们已完成主域名升级。全新域名 fknc.top 现已正式启用，访问更快，并支持微信内直接打开。
          </p>
          <p className="domain-reminder__para">
            旧域名 crazyfarm.cv 将于近期起逐步下线，建议您立即切换至新域名，以免影响后续使用。
          </p>
          <div className="domain-reminder__cta">
            <span className="domain-reminder__cta-text">请立即访问：</span>
            <a href="https://fknc.top" className="domain-reminder__link">fknc.top</a>
          </div>
        </div>
      </div>
    )
  }

  // 如果还在检查登录状态，显示加载中
  if (isAuthenticated === null) {
    return (
      <div className="app">
        <main className="main">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div>加载中...</div>
          </div>
        </main>
      </div>
    )
  }

  // 如果未登录，显示登录页（不展示备案号/公安号）
  if (!isAuthenticated) {
    return (
      <div className="app">
        <main className="main main-login">
          <Login onLoginSuccess={handleLoginSuccess} />
        </main>
      </div>
    )
  }

  // 已登录，显示主应用
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
              <Footer
                subscriptionModalOpen={showSubscriptionModal}
                onSubscriptionModalChange={setShowSubscriptionModal}
                subscriptionState={subscriptionState}
                onSubscriptionActivated={refreshSubscription}
              />
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

      {/* 免费次数已用完，引导开通会员 */}
      <Modal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        title="今日免费次数已用完"
      >
        <div className="modal-text">
          <p>开通会员可无限查询，支持日卡 0.19 元、周卡 0.99 元、月卡 1.99 元、季卡 4.99 元、年卡 9.99 元、三年 19.9 元。</p>
          <button
            type="button"
            className="paywall-cta-button"
            onClick={() => {
              setShowPaywallModal(false)
              setShowSubscriptionModal(true)
            }}
          >
            开通会员
          </button>
        </div>
      </Modal>
    </div>
  )
}
