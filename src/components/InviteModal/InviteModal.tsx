import { useState, useEffect } from 'react'
import { Modal } from '@/components/Modal'
import { getOrCreateInviteCode, getMyInviteStats } from '@/utils/supabase'
import './InviteModal.css'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
}

export const InviteModal = ({ isOpen, onClose }: InviteModalProps) => {
  const [inviteCode, setInviteCode] = useState<string>('')
  const [invitedCount, setInvitedCount] = useState<number>(0)
  const [rewardDays, setRewardDays] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [copyTip, setCopyTip] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setInviteCode('')
    setError(null)
    setLoading(true)
    Promise.all([getOrCreateInviteCode(), getMyInviteStats()])
      .then(([codeRes, statsRes]) => {
        if (cancelled) return
        if (codeRes.ok && codeRes.inviteCode) setInviteCode(codeRes.inviteCode)
        else if (!codeRes.ok) setError(codeRes.error || '获取邀请码失败')
        if (statsRes.ok) {
          setInvitedCount(statsRes.invitedCount ?? 0)
          setRewardDays(statsRes.rewardDays ?? 0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [isOpen])

  const handleCopy = async () => {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopyTip(true)
      setTimeout(() => setCopyTip(false), 2000)
    } catch {
      setCopyTip(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="邀请有礼" contentClassName="invite-modal-content-wrap">
      <div className="invite-modal-content">
        {loading && (
          <div className="invite-modal-loading-wrap" aria-busy="true" aria-label="加载中">
            <div className="invite-modal-spinner" />
            <span className="invite-modal-loading-text">加载中</span>
          </div>
        )}
        {error && (
          <p className="invite-modal-error">{error}</p>
        )}
        {!loading && !error && inviteCode && (
          <>
            {/* 1. 操作步骤 */}
            <div className="invite-modal-section">
              <p className="invite-modal-label">操作步骤</p>
              <p className="invite-modal-intro">
                简单三步，让好友看到你的邀请码并填写：
              </p>
              <div className="invite-modal-steps">
                <div className="invite-modal-step">
                  <span className="invite-modal-step-index">1</span>
                  <span className="invite-modal-step-text">
                    把邀请码发给好友。
                  </span>
                </div>
                <div className="invite-modal-step">
                  <span className="invite-modal-step-index">2</span>
                  <span className="invite-modal-step-text">
                    好友注册时，在「邀请码」输入框里填上你的邀请码。
                  </span>
                </div>
                <div className="invite-modal-step">
                  <span className="invite-modal-step-index">3</span>
                  <span className="invite-modal-step-text">
                    好友注册成功后，你立刻拿到 <strong>1 天会员</strong>；好友首次充值，还能再拿进阶奖励。
                  </span>
                </div>
              </div>
            </div>

            {/* 2. 奖励说明 */}
            <div className="invite-modal-section">
              <p className="invite-modal-label">奖励说明</p>
              <p className="invite-modal-reward-text">
                ① 每成功邀请 1 位新用户注册并填写你的邀请码，系统送你 <strong>1 天会员</strong>。
              </p>
              <p className="invite-modal-reward-text">
                ② 好友后续<strong>首次充值会员</strong>时，再按档位额外送你天数：
              </p>
              <ul className="invite-modal-tier-list">
                <li>好友充周卡 → 再送你 <strong>1 天</strong></li>
                <li>好友充月卡 → 再送你 <strong>7 天</strong></li>
                <li>好友充季卡 → 再送你 <strong>30 天</strong></li>
                <li>好友充年卡 → 再送你 <strong>90 天</strong></li>
                <li>好友充三年 → 再送你 <strong>365 天</strong></li>
              </ul>
            </div>

            {/* 3. 我的邀请码 */}
            <div className="invite-modal-code-block">
              <p className="invite-modal-label">我的邀请码</p>
              <div className="invite-modal-code-row">
                <span className="invite-modal-code">{inviteCode}</span>
                <button type="button" className="invite-modal-copy-btn" onClick={handleCopy}>
                  {copyTip ? '已复制' : '复制'}
                </button>
              </div>
              <p className="invite-modal-code-hint">把这 6 位邀请码发给好友，注册时在「邀请码」里填写即可绑定邀请关系。</p>
            </div>

            {/* 4. 邀请信息 */}
            <div className="invite-modal-section">
              <p className="invite-modal-label">邀请信息</p>
              <p className="invite-modal-stats-row">
                已邀请 <strong>{invitedCount}</strong> 人，已获得 <strong>{rewardDays}</strong> 天会员奖励
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
