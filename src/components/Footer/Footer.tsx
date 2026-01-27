import { useState } from 'react'
import { Modal } from '../Modal'
import { changelog } from '@/data/changelog'
import { submitUserFeedback, signOut } from '@/utils/supabase'
import { Toast } from '../PriceCalculator/Toast'
import './Footer.css'

export const Footer = () => {
  const [showContactModal, setShowContactModal] = useState(false)
  const [showContactQRCode, setShowContactQRCode] = useState(false)
  const [contactType, setContactType] = useState<'author' | 'assistant'>('author')
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showDonateModal, setShowDonateModal] = useState(false)
  const [showChangelogModal, setShowChangelogModal] = useState(false)
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

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
            <div className="footer-link" onClick={() => setShowDonateModal(true)}>
              支持作者
            </div>
            <div className="footer-link" onClick={() => setShowDisclaimerModal(true)}>
              免责声明
            </div>
            <div className="footer-link" onClick={handleSignOut}>
              退出登录
            </div>
          </div>
        </div>
      </footer>

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
      {showToast && <Toast message="反馈成功！感谢您的反馈" />}

      {/* 捐赠二维码模态框 */}
      <Modal
        isOpen={showDonateModal}
        onClose={() => setShowDonateModal(false)}
        title="支持作者"
      >
        <div className="modal-text">
          <p>本工具完全免费，但维持运行需要成本。</p>
          <p>如果你觉得它帮到了你，欢迎扫码支持，</p>
          <p>帮助它活下去、变得更好。</p>
          <p>感谢每一位支持的小伙伴，你们让更新更有意义✨</p>
        </div>
        <img
          src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/收款码1.15.png"
          alt="捐赠二维码"
          className="modal-qrcode"
        />
        <p className="modal-hint">无论是否支持，都感谢你的使用 ❤️</p>
      </Modal>

      {/* 免责声明模态框 */}
      <Modal
        isOpen={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
        title="免责声明"
      >
       <div className="modal-text disclaimer-text">
        <p><strong>1. 版权与素材声明（重要）</strong></p>
        <p>本工具为个人开发、非营利的第三方项目。页面中使用的部分图片素材源自网易游戏《蛋仔派对》，其所有权及相关知识产权均归网易公司所有。</p>
        <p>我们尊重版权，此使用行为旨在为游戏爱好者提供免费的计算辅助，无任何商业目的。我们在此明确不主张对上述素材的任何权利，并对网易游戏创造的内容表示赞赏与尊重。</p>
        <p>若您是该等素材的版权方（或授权代表），认为我们的使用构成侵权，请通过以下方式联系我们，我们将在收到有效通知后第一时间下架或替换相关素材： 574689775@qq.com。</p>
        
        <p><strong>2. 非官方与独立性声明</strong></p>
        <p>本工具为爱好者独立开发，与网易游戏《蛋仔派对》官方无任何关联、赞助或授权关系。非官方产品。</p>
        
        <p><strong>3. 数据免责与风险自担</strong></p>
        <p>本工具所有计算功能、数据及结果均基于对公开游戏机制的分析，仅供参考，不保证100%准确性，不作为游戏内交易的官方依据。实际游戏内数值请以官方发布为准。</p>
        <p>用户因使用、依赖本工具信息所产生的任何直接或间接风险、损失，需自行承担全部责任。</p>
        
        <p><strong>4. 开发者责任限制</strong></p>
        <p>开发者在本工具可用的技术上尽力保证其稳定，但对于服务的连续性、准确性、安全性不作担保。对于因使用本工具而产生的任何问题，开发者的责任在法律允许的最大范围内予以免除。</p>
        
        <p><strong>5. 服务变更与终止</strong></p>
        <p>开发者保留随时修改、暂停或终止本工具服务的权利，无需事先通知。</p>
        
        <p><strong>6. 用户同意</strong></p>
        <p>继续使用本工具，即表示您已阅读、理解并完全同意本声明的全部条款。</p>
      </div>
      </Modal>
    </>
  )
}

