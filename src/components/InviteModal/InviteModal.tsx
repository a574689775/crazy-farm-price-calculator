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
            <div className="invite-modal-rules">
              <p className="invite-modal-label">怎么玩邀请有礼？</p>
              <p className="invite-modal-intro">一句话：好友首充，你白嫖会员天数。</p>
              <div className="invite-modal-steps">
                <div className="invite-modal-step">
                  <span className="invite-modal-step-index">1</span>
                  <span className="invite-modal-step-text">
                    好友注册账号时，在「邀请码」输入框填上你的邀请码，绑定邀请关系。
                  </span>
                </div>
                <div className="invite-modal-step">
                  <span className="invite-modal-step-index">2</span>
                  <span className="invite-modal-step-text">
                    好友<strong>首次充值任意会员档位</strong>后，你会自动获得对应的会员天数。
                  </span>
                </div>
                <div className="invite-modal-step">
                  <span className="invite-modal-step-index">3</span>
                  <span className="invite-modal-step-text">
                    多邀几位好友、让不同账号首充，你的会员天数可以长期叠加，相当于长期白嫖。
                  </span>
                </div>
              </div>
              <ul className="invite-modal-tier-list">
                <li>好友充周卡 → 你得 1 天</li>
                <li>好友充月卡 → 你得 7 天</li>
                <li>好友充季卡 → 你得 30 天</li>
                <li>好友充年卡 → 你得 90 天</li>
                <li>好友充三年 → 你得 365 天</li>
              </ul>
            </div>
            <div className="invite-modal-code-block">
              <p className="invite-modal-label">我的邀请码</p>
              <div className="invite-modal-code-row">
                <span className="invite-modal-code">{inviteCode}</span>
                <button type="button" className="invite-modal-copy-btn" onClick={handleCopy}>
                  {copyTip ? '已复制' : '复制'}
                </button>
              </div>
              <p className="invite-modal-code-hint">直接把这 6 位邀请码发给好友，好友注册账号时在「邀请码」里填上即可。</p>
            </div>
            <div className="invite-modal-stats">
              <p className="invite-modal-label">邀请统计</p>
              <p className="invite-modal-stats-row">
                已邀请 <strong>{invitedCount}</strong> 人，已获得 <strong>{rewardDays}</strong> 天奖励
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
