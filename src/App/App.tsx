import { useState, useEffect, useRef } from 'react'
import type { CropConfig, HistoryRecord, WeatherMutation } from '@/types'
import { crops } from '@/data/crops'
import { changelog } from '@/data/changelog'
import { Footer } from '@/components/Footer'
import { CropSelector } from '@/components/CropSelector'
import { PriceCalculator } from '@/components/PriceCalculator'
import { HistoryView } from '@/components/HistoryView'
import { FeedbackDataView } from '@/components/FeedbackDataView'
import { Login } from '@/components/Login'
import { parseShareUrl } from '@/utils/shareEncoder'
import {
  logCropQuery,
  subscribeCropDailyStats,
  getSession,
  onAuthStateChange,
  useFreeQuery,
  getMySubscription,
  signOut,
} from '@/utils/supabase'
import type { MySubscription } from '@/utils/supabase'
import { Modal } from '@/components/Modal'
import { InviteModal } from '@/components/InviteModal'
import './App.css'

const INVITE_MODAL_FIRST_SHOWN_KEY = 'invite_modal_first_shown'

type Page = 'selector' | 'calculator' | 'feedback'
interface PrefillData {
  weight: number
  mutations: WeatherMutation[]
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
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [subscriptionState, setSubscriptionState] = useState<MySubscription | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showUserCenter, setShowUserCenter] = useState(false)
  const [isUserCenterClosing, setIsUserCenterClosing] = useState(false)
  const [showUserContactModal, setShowUserContactModal] = useState(false)
  const [showUserDisclaimerModal, setShowUserDisclaimerModal] = useState(false)
  const [showUserChangelogModal, setShowUserChangelogModal] = useState(false)

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

  const openUserCenter = () => {
    setIsUserCenterClosing(false)
    setShowUserCenter(true)
  }

  const closeUserCenter = () => {
    setIsUserCenterClosing(true)
    window.setTimeout(() => {
      setShowUserCenter(false)
      setIsUserCenterClosing(false)
    }, 220)
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
      setUserEmail(session?.user?.email ?? null)
    }
    checkAuth()

    // 监听认证状态变化
    const {
      data: { subscription },
    } = onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
      setUserEmail(session?.user?.email ?? null)
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

  // 首次进入选择作物页时自动弹出邀请有礼弹窗（仅一次，用 localStorage 标记）
  useEffect(() => {
    if (!isAuthenticated || currentPage !== 'selector' || showHistory) return
    try {
      if (localStorage.getItem(INVITE_MODAL_FIRST_SHOWN_KEY)) return
      localStorage.setItem(INVITE_MODAL_FIRST_SHOWN_KEY, '1')
      setShowInviteModal(true)
    } catch {
      // ignore
    }
  }, [isAuthenticated, currentPage, showHistory])

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
                onOpenUserCenter={openUserCenter}
                queryCounts={todayQueryCounts}
                subscriptionActive={subscriptionState?.isActive}
              />
              <Footer
                subscriptionModalOpen={showSubscriptionModal}
                onSubscriptionModalChange={setShowSubscriptionModal}
                subscriptionState={subscriptionState}
                onSubscriptionActivated={refreshSubscription}
                contactModalOpen={showUserContactModal}
                onContactModalChange={setShowUserContactModal}
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

      {/* 个人中心抽屉 */}
      {showUserCenter && (
        <>
          <div
            className={`user-center-overlay ${isUserCenterClosing ? 'closing' : ''}`}
            onClick={closeUserCenter}
          />
          <aside className={`user-center-drawer ${isUserCenterClosing ? 'closing' : ''}`}>
            <div className="user-center-header">
              <div className="user-center-title">个人中心</div>
              <button
                type="button"
                className="user-center-close"
                onClick={closeUserCenter}
                aria-label="关闭个人中心"
              >
                ×
              </button>
            </div>
            <div className="user-center-body">
              <div className="user-center-section">
                <div className="user-center-user">
                  <div className="user-center-avatar">
                    {(userEmail && userEmail[0]?.toUpperCase()) || 'U'}
                  </div>
                  <div className="user-center-user-text">
                    <div className="user-center-user-email">{userEmail || '已登录用户'}</div>
                    <div className="user-center-user-tag">
                      {subscriptionState?.isActive ? '会员用户' : '免费用户'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="user-center-section">
                <div className="user-center-membership">
                  {subscriptionState?.isActive ? (
                    <>
                      <div className="user-center-membership-main">已开通会员 · 不限次数查询</div>
                      {subscriptionState.subscriptionEndAt && (
                        <div className="user-center-membership-sub">
                          有效期至{' '}
                          {new Date(subscriptionState.subscriptionEndAt).toLocaleDateString('zh-CN', {
                            timeZone: 'Asia/Shanghai',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="user-center-membership-main">当前为免费用户</div>
                      <div className="user-center-membership-sub">每日免费进入计算器 1 次，开通会员解锁不限次体验。</div>
                    </>
                  )}
                  <button
                    type="button"
                    className="user-center-primary-btn"
                    onClick={() => {
                      closeUserCenter()
                      setShowSubscriptionModal(true)
                    }}
                  >
                    {subscriptionState?.isActive ? '续费会员' : '开通会员'}
                  </button>
                </div>
              </div>

              <div className="user-center-section">
                <div className="user-center-section-title">功能</div>
                <div className="user-center-item-list">
                  <button
                    type="button"
                    className="user-center-item"
                    onClick={() => {
                      closeUserCenter()
                      handleShowHistory()
                    }}
                  >
                    <span className="user-center-item-label">计算历史</span>
                    <span className="user-center-item-arrow">›</span>
                  </button>
                  <button
                    type="button"
                    className="user-center-item"
                    onClick={() => {
                      closeUserCenter()
                      setShowInviteModal(true)
                    }}
                  >
                    <span className="user-center-item-label">邀请有礼</span>
                    <span className="user-center-item-arrow">›</span>
                  </button>
                </div>
              </div>
              <div className="user-center-section">
                <div className="user-center-section-title">帮助与关于</div>
                <div className="user-center-item-list">
                  <button
                    type="button"
                    className="user-center-item"
                    onClick={() => {
                      closeUserCenter()
                      setShowUserContactModal(true)
                    }}
                  >
                    <span className="user-center-item-label">联系我们</span>
                    <span className="user-center-item-arrow">›</span>
                  </button>
                  <button
                    type="button"
                    className="user-center-item"
                    onClick={() => {
                      closeUserCenter()
                      setShowUserDisclaimerModal(true)
                    }}
                  >
                    <span className="user-center-item-label">免责声明</span>
                    <span className="user-center-item-arrow">›</span>
                  </button>
                  <button
                    type="button"
                    className="user-center-item"
                    onClick={() => {
                      closeUserCenter()
                      setShowUserChangelogModal(true)
                    }}
                  >
                    <span className="user-center-item-label">更新日志</span>
                    <span className="user-center-item-right">
                      <span className="user-center-item-extra">{changelog[0].version}</span>
                      <span className="user-center-item-arrow">›</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div className="user-center-section user-center-section-danger">
              <button
                type="button"
                className="user-center-danger-btn"
                onClick={async () => {
                  setShowUserCenter(false)
                  try {
                    await signOut()
                  } finally {
                    window.location.reload()
                  }
                }}
              >
                退出登录
              </button>
            </div>
          </aside>
        </>
      )}

      {/* 免费次数已用完，引导开通会员 */}
      <Modal
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        title="今日免费次数已用完"
      >
        <div className="modal-text">
          <p className="paywall-plan-desc">开通会员后不限次数查价</p>
          <p className="paywall-plan-desc">随时尝试不同作物和突变组合</p>
          <p className="paywall-plan-desc">帮你更快找到最赚的搭配</p>
          <div className="paywall-plan-card">
            <div className="paywall-plan-main">
              <span className="paywall-plan-name">月卡会员</span>
              <span className="paywall-plan-price">¥1.99</span>
            </div>
            <div className="paywall-plan-sub">疯狂农场骨灰玩家，推荐选择这个档位</div>
          </div>
         
          <p className="paywall-plan-other">其它档位：日卡 0.19｜周卡 0.99｜季卡 4.99｜年卡 9.99｜三年卡 19.9（单位：元）</p>
          <button
            type="button"
            className="paywall-cta-button"
            onClick={() => {
              setShowPaywallModal(false)
              setShowSubscriptionModal(true)
            }}
          >
            开通会员，解锁无限查询
          </button>
          <p className="paywall-invite-hint">
            邀请好友首充会员，你也可以获得会员奖励！
          </p>
          <button
            type="button"
            className="paywall-invite-button"
            onClick={() => {
              setShowPaywallModal(false)
              setShowInviteModal(true)
            }}
          >
            邀请好友，白嫖会员天数
          </button>
        </div>
      </Modal>

      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />

      {/* 个人中心：更新日志模态框 */}
      <Modal
        isOpen={showUserChangelogModal}
        onClose={() => setShowUserChangelogModal(false)}
        title="更新日志"
      >
        <div className="changelog">
          {changelog.map((item) => (
            <div key={item.version} className="changelog-item">
              <h4 className="changelog-version">
                {item.version} <span className="changelog-date">({item.date})</span>
              </h4>
              <ul className="changelog-list">
                {item.items.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>

      {/* 个人中心：联系我们，转由 Footer 控制原有模态框 */}

      {/* 个人中心：免责声明模态框（复用 Footer 内容） */}
      <Modal
        isOpen={showUserDisclaimerModal}
        onClose={() => setShowUserDisclaimerModal(false)}
        title="免责声明"
      >
        <div className="modal-text disclaimer-text">
          <p><strong>1. 收费与合规说明</strong></p>
          <p>本工具已实行部分收费，并非完全免费。收费手续合法，运营主体已完成企业备案。根据现行法规，本服务类型不需要 ICP 许可证。</p>

          <p><strong>2. 版权与素材声明（重要）</strong></p>
          <p>页面中的作物等图片素材来源于网易游戏《蛋仔派对》，其所有权及知识产权归网易公司所有。我们仅将上述图片用于标识作物，不用于其他用途，不主张任何素材权利，并尊重网易游戏原创内容。</p>
          <p>如您为相关素材的版权方或授权方，认为本使用方式构成侵权，请通过 574689775@qq.com 联系我们，我们将在收到有效通知后及时下架或替换相关素材。</p>
          
          <p><strong>3. 非官方与独立性声明</strong></p>
          <p>本工具为爱好者独立开发，与网易游戏《蛋仔派对》官方无任何关联、赞助或授权关系。非官方产品。</p>
          
          <p><strong>4. 数据免责与风险自担</strong></p>
          <p>本工具所有计算功能、数据及结果均基于对公开游戏机制的分析，仅供参考，不保证100%准确性，不作为游戏内交易的官方依据。实际游戏内数值请以官方发布为准。</p>
          <p>用户因使用、依赖本工具信息所产生的任何直接或间接风险、损失，需自行承担全部责任。</p>
          
          <p><strong>5. 开发者责任限制</strong></p>
          <p>开发者在本工具可用的技术上尽力保证其稳定，但对于服务的连续性、准确性、安全性不作担保。对于因使用本工具而产生的任何问题，开发者的责任在法律允许的最大范围内予以免除。</p>
          
          <p><strong>6. 服务变更与终止</strong></p>
          <p>开发者保留随时修改、暂停或终止本工具服务的权利，无需事先通知。</p>
          
          <p><strong>7. 用户同意</strong></p>
          <p>继续使用本工具，即表示您已阅读、理解并完全同意本声明的全部条款。</p>
        </div>
      </Modal>
    </div>
  )
}
