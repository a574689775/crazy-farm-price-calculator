import { useState } from 'react'
import { Modal } from '../Modal'
import { changelog } from '@/data/changelog'
import { submitUserFeedback, signOut, activateSubscriptionWithCode, getMySubscription } from '@/utils/supabase'
import type { MySubscription } from '@/utils/supabase'
import { Toast } from '../PriceCalculator/Toast'
import './Footer.css'

interface FooterProps {
  hideSignOut?: boolean
  /** 登录页不显示会员入口，未登录只能先登录 */
  hideSubscription?: boolean
  /** 由父组件控制会员弹窗时传入 */
  subscriptionModalOpen?: boolean
  onSubscriptionModalChange?: (open: boolean) => void
  /** 服务端会员状态（换设备同步、服务端判断是否过期） */
  subscriptionState?: MySubscription | null
  /** 激活成功后由父组件刷新会员状态 */
  onSubscriptionActivated?: () => void
}

export const Footer = ({
  hideSignOut = false,
  hideSubscription = false,
  subscriptionModalOpen,
  onSubscriptionModalChange,
  subscriptionState,
  onSubscriptionActivated,
}: FooterProps) => {
  const [showContactModal, setShowContactModal] = useState(false)
  const [showContactQRCode, setShowContactQRCode] = useState(false)
  const [contactType, setContactType] = useState<'author' | 'assistant'>('author')
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showChangelogModal, setShowChangelogModal] = useState(false)
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false)
  const [internalSubscriptionModal, setInternalSubscriptionModal] = useState(false)
  const showSubscriptionModal =
    onSubscriptionModalChange !== undefined ? (subscriptionModalOpen ?? false) : internalSubscriptionModal
  const setShowSubscriptionModal =
    onSubscriptionModalChange !== undefined ? (open: boolean) => onSubscriptionModalChange(open) : setInternalSubscriptionModal
  const [imageLoading, setImageLoading] = useState(true)
  const [activationCode, setActivationCode] = useState('')
  const [activationLoading, setActivationLoading] = useState(false)
  const [activationError, setActivationError] = useState('')

  const subscriptionActive = subscriptionState?.isActive ?? false
  const subscriptionEnd = subscriptionState?.subscriptionEndAt ?? null
  // 剩余天数（仅当已过期时为 0，未过期为大于 0 的整数）
  const subscriptionDaysLeft =
    subscriptionEnd != null
      ? Math.max(0, Math.ceil((subscriptionEnd - Date.now()) / (24 * 60 * 60 * 1000)))
      : null

  const handleBackToOptions = () => {
    setShowContactQRCode(false)
    setShowFeedbackForm(false)
    setImageLoading(true) // 返回时重置加载状态
    setContactType('author') // 重置为默认值
  }

  const handleShowAuthorQRCode = () => {
    setContactType('author')
    setShowContactQRCode(true)
    setImageLoading(true)
  }

  const handleShowAssistantQRCode = () => {
    setContactType('assistant')
    setShowContactQRCode(true)
    setImageLoading(true)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await submitUserFeedback(feedbackContent.trim())
      setFeedbackContent('')
      setShowFeedbackForm(false)
      setShowContactModal(false)
      setToastMessage('反馈成功！感谢您的反馈')
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 2000)
    } catch (error) {
      console.error('提交反馈失败:', error)
      alert('提交失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActivationSubmit = async () => {
    const code = activationCode.trim()
    if (!code) {
      setActivationError('请输入激活码')
      return
    }
    setActivationLoading(true)
    setActivationError('')
    try {
      const { ok, error } = await activateSubscriptionWithCode(code)
      if (ok) {
        setActivationCode('')
        setActivationError('')
        onSubscriptionActivated?.()
        setShowSubscriptionModal(false)
        // 激活成功后，重新获取会员状态，用于展示最新剩余天数
        try {
          const latest = await getMySubscription()
          if (latest && latest.subscriptionEndAt) {
            const daysLeft = Math.max(
              0,
              Math.ceil((latest.subscriptionEndAt - Date.now()) / (24 * 60 * 60 * 1000)),
            )
            setToastMessage(`激活成功！有效时长 ${daysLeft} 天`)
          } else {
            setToastMessage('激活成功！会员已生效')
          }
        } catch {
          setToastMessage('激活成功！会员已生效')
        }
        setShowToast(true)
        setTimeout(() => {
          setShowToast(false)
        }, 2500)
      } else {
        setActivationError(error || '激活失败')
      }
    } catch (e) {
      setActivationError((e as Error).message || '网络错误，请重试')
    } finally {
      setActivationLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      // 刷新页面，让 App 重新检查登录状态
      window.location.reload()
    } catch (error) {
      console.error('登出失败:', error)
      alert('登出失败，请稍后重试')
    }
  }

  const PURCHASE_URL = 'https://pay.ldxp.cn/shop/TX7BUFYY/cb2cs2'

  const handleOpenPurchasePage = () => {
    window.open(PURCHASE_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-link" onClick={() => setShowChangelogModal(true)}>
            {changelog[0].version}
          </div>
          <div className="footer-actions">
            <div className="footer-link" onClick={() => setShowContactModal(true)}>
              联系我们
            </div>
            {!hideSubscription && (
              <div className="footer-link" onClick={() => setShowSubscriptionModal(true)}>
                {subscriptionActive ? '续费会员' : '开通会员'}
              </div>
            )}
            <div className="footer-link" onClick={() => setShowDisclaimerModal(true)}>
              免责声明
            </div>
            {!hideSignOut && (
              <div className="footer-link" onClick={handleSignOut}>
                退出登录
              </div>
            )}
          </div>
        </div>
      </footer>
      <div className="footer-beian">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">冀ICP备2024055698号-3</a>
        {/* <a href="https://beian.mps.gov.cn/" target="_blank" rel="noopener noreferrer">京公网安备11040102700068号</a> */}
      </div>

      {/* 更新日志模态框 */}
      <Modal
        isOpen={showChangelogModal}
        onClose={() => setShowChangelogModal(false)}
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

      {/* 联系我们模态框 */}
      <Modal
        isOpen={showContactModal}
        onClose={() => {
          setShowContactModal(false)
          setShowContactQRCode(false)
          setShowFeedbackForm(false)
          setFeedbackContent('')
          setImageLoading(true)
          setContactType('author')
        }}
        title={'联系我们'}
        onBack={(showContactQRCode || showFeedbackForm) ? handleBackToOptions : undefined}
      >
        {showContactQRCode ? (
          <>
            <div className="modal-qrcode-wrapper">
              {imageLoading && (
                <div className="modal-qrcode-placeholder">
                  <div className="modal-qrcode-loading"></div>
                </div>
              )}
              <img
                src={contactType === 'author' 
                  ? 'https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/大脸猫vx.jpg'
                  : 'https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/蓝皮鼠vx.jpg'
                }
                alt="联系方式"
                className={`modal-qrcode ${imageLoading ? 'modal-qrcode-hidden' : ''}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
            <p className="modal-hint">扫码添加微信，我们会尽快回复</p>
          </>
        ) : showFeedbackForm ? (
          <div className="feedback-form">
            <div className="feedback-textarea-wrapper">
              <textarea
                className="feedback-textarea"
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                placeholder="请输入您的反馈内容..."
                rows={8}
              />
            </div>
            <button
              className="feedback-submit-button"
              onClick={handleSubmitFeedback}
              disabled={!feedbackContent.trim() || isSubmitting}
            >
              {isSubmitting ? '提交中...' : '提交反馈'}
            </button>
          </div>
        ) : (
          <div className="contact-options">
            <button
              className="contact-option-button"
              onClick={handleShowAuthorQRCode}
            >
              <div className="contact-option-title">商业合作 / 技术贡献</div>
              <div className="contact-option-desc">联系作者</div>
            </button>
            <button
              className="contact-option-button"
              onClick={handleShowAssistantQRCode}
            >
              <div className="contact-option-title">加入用户群 / 使用教程</div>
              <div className="contact-option-desc">联系助理</div>
            </button>
            <button
              className="contact-option-button"
              onClick={() => setShowFeedbackForm(true)}
            >
              <div className="contact-option-title">我要反馈</div>
              <div className="contact-option-desc">提交您的建议或问题</div>
            </button>
          </div>
        )}
      </Modal>

      {/* Toast 提示 */}
      {showToast && <Toast message={toastMessage} />}

      {/* 会员 / 续费 / 激活码模态框 */}
      <Modal
        isOpen={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false)
          setActivationCode('')
          setActivationError('')
        }}
        title={subscriptionActive ? '续费会员' : '开通会员'}
      >
        <div className="subscription-modal-content">
          {subscriptionActive && subscriptionEnd != null && (
            <div className="modal-text subscription-status subscription-status-inline">
              <p>
                会员有效期至：<strong>{new Date(subscriptionEnd).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                {subscriptionDaysLeft != null && (
                  <span className="subscription-days-left">（剩余 {subscriptionDaysLeft} 天）</span>
                )}
              </p>
              <p className="subscription-tip">续费后将在当前到期时间上顺延，不会缩短已有时长。</p>
            </div>
          )}
          <div className="modal-text subscription-plans">
            <p className="subscription-plans-title">{subscriptionActive ? '续费流程' : '开通流程'}</p>
            <p className="subscription-plans-desc">
              1. 在下方购买页面选择合适的会员档位完成支付；
              <br />
              2. 支付成功后复制激活码，回到本页面在下方输入并激活。
            </p>
            <p className="subscription-plans-title">会员档位与价格</p>
            <ul className="subscription-plans-list">
              <li onClick={handleOpenPurchasePage}>
                <span className="subscription-plan-name">日卡</span>
                <span className="subscription-plan-price">0.19 元</span>
              </li>
              <li onClick={handleOpenPurchasePage}>
                <span className="subscription-plan-name">周卡</span>
                <span className="subscription-plan-price">0.99 元</span>
              </li>
              <li onClick={handleOpenPurchasePage}>
                <span className="subscription-plan-name">
                  月卡
                  <span className="subscription-plan-tag">推荐</span>
                </span>
                <span className="subscription-plan-price">1.99 元</span>
              </li>
              <li onClick={handleOpenPurchasePage}>
                <span className="subscription-plan-name">季卡</span>
                <span className="subscription-plan-price">4.99 元</span>
              </li>
              <li onClick={handleOpenPurchasePage}>
                <span className="subscription-plan-name">年卡</span>
                <span className="subscription-plan-price">9.99 元</span>
              </li>
              <li onClick={handleOpenPurchasePage}>
                <span className="subscription-plan-name">三年</span>
                <span className="subscription-plan-price">19.9 元</span>
              </li>
            </ul>
            <button
              type="button"
              className="subscription-plan-btn subscription-plan-btn-single"
              onClick={handleOpenPurchasePage}
            >
              前往购买会员
              <span className="subscription-plan-btn-arrow">→</span>
            </button>
            <p className="subscription-plans-hint">
              {subscriptionActive ? '购买后在下方输入激活码即可续费，时长将累加至当前到期日之后。' : '购买后在下方输入激活码即可开通，有效期自激活之日起按档位计算。'}
            </p>
          </div>
          <div className="activation-code-form">
            <input
              type="text"
              className="activation-code-input"
              value={activationCode}
              onChange={(e) => {
                setActivationCode(e.target.value)
                setActivationError('')
              }}
              placeholder="请输入 CF- 开头的激活码"
              disabled={activationLoading}
            />
            {activationError && <p className="activation-code-error">{activationError}</p>}
            <button
              type="button"
              className="activation-code-submit"
              onClick={handleActivationSubmit}
              disabled={activationLoading || !activationCode.trim()}
            >
              {activationLoading ? '验证中...' : subscriptionActive ? '续费' : '激活'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 免责声明模态框 */}
      <Modal
        isOpen={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
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
    </>
  )
}

