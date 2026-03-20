import { useState, useEffect } from 'react'
import { EyeOutlined, EyeInvisibleOutlined, LeftOutlined } from '@ant-design/icons'
import {
  supabase,
  signIn,
  sendResetPasswordCode,
  verifyResetPasswordCode,
  sendEmailOtp,
  verifyEmailOtp,
  assignRandomDisplayName,
  sendSmsCode,
  getEmailByPhone,
  verifySmsCodeForRegister,
  resetPasswordByPhone,
  bindInviteRelation,
} from '@/utils/supabase'
import { translateSupabaseError } from '@/utils/errorMessages'
import { Toast } from '../PriceCalculator/Toast'
import { Footer } from '../Footer'
import { Modal } from '../Modal'
import './Login.css'

const LOGIN_EMAIL_KEY = 'crazy-farm-login-email'
const LOGIN_PHONE_KEY = 'crazy-farm-login-phone'

function getStoredEmail(): string {
  try {
    return localStorage.getItem(LOGIN_EMAIL_KEY) || ''
  } catch {
    return ''
  }
}

function setStoredEmail(value: string) {
  try {
    if (value) localStorage.setItem(LOGIN_EMAIL_KEY, value)
    else localStorage.removeItem(LOGIN_EMAIL_KEY)
  } catch {}
}

function getStoredPhone(): string {
  try {
    return localStorage.getItem(LOGIN_PHONE_KEY) || ''
  } catch {
    return ''
  }
}

function setStoredPhone(value: string) {
  try {
    if (value) localStorage.setItem(LOGIN_PHONE_KEY, value)
    else localStorage.removeItem(LOGIN_PHONE_KEY)
  } catch {}
}

interface LoginProps {
  onLoginSuccess: () => void
  /** 点击「免责声明」时打开弹窗（登录页由 App 传入） */
  onOpenDisclaimer?: () => void
  /** 点击「用户隐私」时打开弹窗（登录页由 App 传入） */
  onOpenPrivacy?: () => void
}

export const Login = ({ onLoginSuccess, onOpenDisclaimer, onOpenPrivacy }: LoginProps) => {
  const [email, setEmail] = useState(getStoredEmail)
  const [isPhoneLogin, setIsPhoneLogin] = useState(true)
  const [phone, setPhone] = useState(getStoredPhone)
  const [phoneCode, setPhoneCode] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [resetPasswordCode, setResetPasswordCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordByPhone, setForgotPasswordByPhone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [resetCodeSent, setResetCodeSent] = useState(false)
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [resetCountdown, setResetCountdown] = useState(0)
  const [phoneCountdown, setPhoneCountdown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [showTermsConfirmModal, setShowTermsConfirmModal] = useState(false)

  // 注册验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 手机号登录验证码倒计时
  useEffect(() => {
    if (phoneCountdown > 0) {
      const timer = setTimeout(() => {
        setPhoneCountdown(phoneCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [phoneCountdown])

  // 找回密码验证码倒计时
  useEffect(() => {
    if (resetCountdown > 0) {
      const timer = setTimeout(() => {
        setResetCountdown(resetCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resetCountdown])

  const showToastWithMessage = (msg: string) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 3000)
  }

  const handleSendCode = async () => {
    if (!email) {
      showToastWithMessage('请先输入邮箱地址')
      return
    }

    setSendingCode(true)

    try {
      await sendEmailOtp(email)
      setCodeSent(true)
      setCountdown(60)
      showToastWithMessage('验证码已发送，请查收邮箱')
    } catch (err: any) {
      const errorMsg = translateSupabaseError(err)
      showToastWithMessage(errorMsg)
    } finally {
      setSendingCode(false)
    }
  }

  const performSubmit = async () => {
    setLoading(true)

    try {
      if (isSignUp) {
        // 验证密码是否一致
        if (password !== confirmPassword) {
          setToastMessage('两次输入的密码不一致')
          setShowToast(true)
          setTimeout(() => {
            setShowToast(false)
          }, 3000)
          setLoading(false)
          return
        }

        if (!verificationCode) {
          setToastMessage('请输入验证码')
          setShowToast(true)
          setTimeout(() => {
            setShowToast(false)
          }, 3000)
          setLoading(false)
          return
        }

        // 使用验证码注册
        await verifyEmailOtp(email, verificationCode, password)
        await assignRandomDisplayName().catch(() => {})
        if (inviteCode.trim()) {
          await bindInviteRelation(inviteCode.trim()).catch(() => {})
        }
        setToastMessage('注册成功！正在登录...')
        setShowToast(true)
        setTimeout(() => {
          setShowToast(false)
          setStoredEmail(email)
          onLoginSuccess()
        }, 1500)
      } else {
        await signIn(email, password)
        setStoredEmail(email)
        onLoginSuccess()
      }
    } catch (err: any) {
      const errorMsg = translateSupabaseError(err)
      showToastWithMessage(errorMsg)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 仅登录时要求阅读并同意；注册不展示该选项，直接提交
    if (!isSignUp && !agreeToTerms) {
      setShowTermsConfirmModal(true)
      return
    }

    await performSubmit()
  }

  const handleSendResetCode = async () => {
    if (!email) {
      showToastWithMessage('请先输入邮箱地址')
      return
    }

    setSendingCode(true)

    try {
      await sendResetPasswordCode(email)
      setResetCodeSent(true)
      setResetCountdown(60)
      showToastWithMessage('验证码已发送，请查收邮箱')
    } catch (err: any) {
      const errorMsg = translateSupabaseError(err)
      showToastWithMessage(errorMsg)
    } finally {
      setSendingCode(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmNewPassword) {
      showToastWithMessage('两次输入的密码不一致')
      setLoading(false)
      return
    }

    if (!resetPasswordCode) {
      showToastWithMessage('请输入验证码')
      setLoading(false)
      return
    }

    if (!newPassword) {
      showToastWithMessage('请输入新密码')
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      if (forgotPasswordByPhone) {
        const res = await resetPasswordByPhone(phone, resetPasswordCode, newPassword)
        if (!res.ok) {
          showToastWithMessage(res.error || '重置失败，请稍后再试')
          setLoading(false)
          return
        }
        const emailRes = await getEmailByPhone(phone)
        if (!emailRes.ok || !emailRes.email) {
          showToastWithMessage('密码已重置，请使用手机号+新密码登录')
          setLoading(false)
          setShowForgotPassword(false)
          setForgotPasswordByPhone(false)
          return
        }
        await signIn(emailRes.email, newPassword)
        setStoredPhone(phone)
        showToastWithMessage('密码重置成功！正在登录...')
        setTimeout(() => onLoginSuccess(), 1500)
      } else {
        await verifyResetPasswordCode(email, resetPasswordCode, newPassword)
        showToastWithMessage('密码重置成功！正在登录...')
        setTimeout(() => {
          setStoredEmail(email)
          onLoginSuccess()
        }, 1500)
      }
    } catch (err: any) {
      const errorMsg = translateSupabaseError(err)
      showToastWithMessage(errorMsg)
      setLoading(false)
    }
  }

  const handleSendPhoneResetCode = async () => {
    if (!phone) {
      showToastWithMessage('请先输入手机号')
      return
    }
    setSendingCode(true)
    try {
      const res = await sendSmsCode(phone, 'reset_password')
      if (!res.ok) {
        showToastWithMessage(res.error || '验证码发送失败，请稍后再试')
        return
      }
      setResetCodeSent(true)
      setResetCountdown(60)
      showToastWithMessage('验证码已发送，请查收短信')
    } finally {
      setSendingCode(false)
    }
  }

  const handleSendPhoneRegisterCode = async () => {
    if (!phone) {
      showToastWithMessage('请先输入手机号')
      return
    }
    setSendingCode(true)
    try {
      const res = await sendSmsCode(phone, 'register')
      if (!res.ok) {
        showToastWithMessage(res.error || '验证码发送失败，请稍后再试')
        return
      }
      setPhoneCodeSent(true)
      setPhoneCountdown(60)
      showToastWithMessage('验证码已发送，请查收短信')
    } finally {
      setSendingCode(false)
    }
  }

  const performPhoneLogin = async () => {
    if (!phone || !password) {
      showToastWithMessage('请输入手机号和密码')
      return
    }
    setLoading(true)
    try {
      const emailRes = await getEmailByPhone(phone)
      if (!emailRes.ok || !emailRes.email) {
        showToastWithMessage(emailRes.error || '该手机号未注册，请先注册')
        setLoading(false)
        return
      }
      await signIn(emailRes.email, password)
      setStoredPhone(phone)
      onLoginSuccess()
    } catch (err: any) {
      const errorMsg = translateSupabaseError(err)
      showToastWithMessage(errorMsg)
      setLoading(false)
    }
  }

  const handlePhoneLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreeToTerms) {
      setShowTermsConfirmModal(true)
      return
    }
    await performPhoneLogin()
  }

  const handlePhoneRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      showToastWithMessage('两次输入的密码不一致')
      return
    }
    if (!phone || !phoneCode || !password) {
      showToastWithMessage('请填写手机号、验证码并设置密码')
      return
    }
    if (password.length < 6) {
      showToastWithMessage('密码至少 6 位')
      return
    }
    setLoading(true)
    try {
      const res = await verifySmsCodeForRegister(phone, phoneCode, password)
      if (!res.ok || !res.session) {
        showToastWithMessage(res.error || '注册失败，请稍后再试')
        setLoading(false)
        return
      }
      await supabase.auth.setSession(res.session)
      await assignRandomDisplayName().catch(() => {})
      if (inviteCode.trim()) {
        await bindInviteRelation(inviteCode.trim()).catch(() => {})
      }
      setStoredPhone(phone)
      showToastWithMessage('注册成功！正在登录...')
      setTimeout(() => onLoginSuccess(), 1500)
    } catch (err: any) {
      const msg = err?.message || '注册失败，请稍后再试'
      showToastWithMessage(msg)
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <img 
          src="/carzyfarm/蛋仔.png" 
          alt="蛋仔" 
          className="login-top-image"
        />
        <img 
          src="/carzyfarm/hi.png" 
          alt="hi" 
          className="login-hi-image"
        />
        <div className="login-header">
          {(showForgotPassword || isSignUp) && (
            <span
              className="login-back-link"
              onClick={() => {
                if (loading) return
                setShowForgotPassword(false)
                setForgotPasswordByPhone(false)
                setIsSignUp(false)
              }}
            >
              <LeftOutlined />
            </span>
          )}
          {showForgotPassword ? (
            <h2 className="login-title">{forgotPasswordByPhone ? '手机号找回密码' : '重置密码'}</h2>
          ) : isSignUp ? (
            <h2 className="login-title">{isPhoneLogin ? '手机号注册' : '邮箱注册'}</h2>
          ) : (
            <div className="login-tab-row login-tab-row-large">
              <div
                className={isPhoneLogin ? 'login-tab login-tab-active' : 'login-tab'}
                onClick={() => {
                  if (!loading) setIsPhoneLogin(true)
                }}
              >
                <span>手机号登录</span>
                <span className="login-tab-badge">推荐</span>
              </div>
              <div
                className={isPhoneLogin ? 'login-tab' : 'login-tab login-tab-active'}
                onClick={() => {
                  if (!loading) setIsPhoneLogin(false)
                }}
              >
                <span>邮箱登录</span>
              </div>
            </div>
          )}
        </div>

        {showForgotPassword ? (
          <form className="login-form" onSubmit={handleForgotPassword}>
            {!forgotPasswordByPhone ? (
              <>
                <div className="login-input-group">
                  <label className="login-label">邮箱</label>
                  <input
                    type="email"
                    className="login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入注册邮箱"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="login-input-group">
                  <label className="login-label">验证码</label>
                  <div className="login-verification-wrapper">
                    <input
                      type="text"
                      className="login-input login-verification-input"
                      value={resetPasswordCode}
                      onChange={(e) => setResetPasswordCode(e.target.value)}
                      placeholder="请输入验证码"
                      required
                      disabled={loading}
                      maxLength={8}
                    />
                    <button
                      type="button"
                      className="login-send-code-button"
                      onClick={handleSendResetCode}
                      disabled={sendingCode || !email || loading || resetCountdown > 0}
                    >
                      {sendingCode ? '发送中...' : resetCountdown > 0 ? `${resetCountdown}秒后重发` : resetCodeSent ? '重新发送' : '发送验证码'}
                    </button>
                  </div>
                  <p className="login-email-code-hint">若长时间未收到验证码，请先检查垃圾邮箱或广告邮件。</p>
                </div>
              </>
            ) : (
              <>
                <div className="login-input-group">
                  <label className="login-label">手机号</label>
                  <input
                    type="tel"
                    className="login-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="请输入中国大陆手机号"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="login-input-group">
                  <label className="login-label">验证码</label>
                  <div className="login-verification-wrapper">
                    <input
                      type="text"
                      className="login-input login-verification-input"
                      value={resetPasswordCode}
                      onChange={(e) => setResetPasswordCode(e.target.value)}
                      placeholder="请输入短信验证码"
                      required
                      disabled={loading}
                      maxLength={6}
                    />
                    <button
                      type="button"
                      className="login-send-code-button"
                      onClick={handleSendPhoneResetCode}
                      disabled={sendingCode || !phone || loading || resetCountdown > 0}
                    >
                      {sendingCode ? '发送中...' : resetCountdown > 0 ? `${resetCountdown}秒后重发` : resetCodeSent ? '重新发送' : '发送验证码'}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="login-input-group">
              <label className="login-label">新密码</label>
              <div className="login-password-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="login-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowNewPassword(!showNewPassword)
                    e.currentTarget.parentElement?.querySelector('input')?.focus()
                  }}
                  disabled={loading}
                >
                  {showNewPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
            </div>

            <div className="login-input-group">
              <label className="login-label">确认密码</label>
              <div className="login-password-wrapper">
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  className="login-input"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowConfirmNewPassword(!showConfirmNewPassword)
                    e.currentTarget.parentElement?.querySelector('input')?.focus()
                  }}
                  disabled={loading}
                >
                  {showConfirmNewPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-button login-submit-button--compact"
              disabled={
                loading ||
                !(forgotPasswordByPhone ? phone : email) ||
                !resetPasswordCode ||
                !newPassword ||
                !confirmNewPassword
              }
            >
              {loading ? '处理中...' : '重置密码'}
            </button>
          </form>
        ) : isPhoneLogin ? (
          isSignUp ? (
            <form className="login-form" onSubmit={handlePhoneRegisterSubmit}>
              <div className="login-input-group">
                <label className="login-label">手机号</label>
                <input
                  type="tel"
                  className="login-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入中国大陆手机号"
                  required
                  disabled={loading}
                />
              </div>

              <div className="login-input-group">
                <label className="login-label">验证码</label>
                <div className="login-verification-wrapper">
                  <input
                    type="text"
                    className="login-input login-verification-input"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="请输入短信验证码"
                    required
                    disabled={loading}
                    maxLength={6}
                  />
                  <button
                    type="button"
                    className="login-send-code-button"
                    onClick={handleSendPhoneRegisterCode}
                    disabled={sendingCode || !phone || loading || phoneCountdown > 0}
                  >
                    {sendingCode
                      ? '发送中...'
                      : phoneCountdown > 0
                        ? `${phoneCountdown}秒后重发`
                        : phoneCodeSent
                          ? '重新发送'
                          : '发送验证码'}
                  </button>
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-label">邀请码（选填）</label>
                <input
                  type="text"
                  className="login-input"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.trim().slice(0, 6))}
                  placeholder="如有邀请码请填写"
                  disabled={loading}
                  maxLength={6}
                />
              </div>

              <div className="login-input-group">
                <label className="login-label">密码</label>
                <div className="login-password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请设置至少 6 位密码"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowPassword(!showPassword)
                      e.currentTarget.parentElement?.querySelector('input')?.focus()
                    }}
                    disabled={loading}
                  >
                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-label">确认密码</label>
                <div className="login-password-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="login-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowConfirmPassword(!showConfirmPassword)
                      e.currentTarget.parentElement?.querySelector('input')?.focus()
                    }}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit-button login-submit-button--compact"
                disabled={
                  loading ||
                  !phone ||
                  !phoneCode ||
                  !password ||
                  !confirmPassword ||
                  password !== confirmPassword
                }
              >
                {loading ? '处理中...' : '注册'}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handlePhoneLoginSubmit}>
              <div className="login-input-group">
                <label className="login-label">手机号</label>
                <input
                  type="tel"
                  className="login-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入中国大陆手机号"
                  required
                  disabled={loading}
                />
              </div>

              <div className="login-input-group">
                <label className="login-label">密码</label>
                <div className="login-password-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowPassword(!showPassword)
                      e.currentTarget.parentElement?.querySelector('input')?.focus()
                    }}
                    disabled={loading}
                  >
                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
                </div>
                <div className="login-forgot-link">
                  <button
                    type="button"
                    className="login-forgot-button"
                    onClick={() => {
                      if (!loading) {
                        setShowForgotPassword(true)
                        setForgotPasswordByPhone(true)
                        setResetPasswordCode('')
                        setResetCountdown(0)
                        setResetCodeSent(false)
                      }
                    }}
                    disabled={loading}
                  >
                    忘记密码？
                  </button>
                </div>
              </div>

              <label className="login-agree-row">
                <input
                  type="checkbox"
                  className="login-agree-checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  disabled={loading}
                />
                <span className="login-agree-text">
                  我已阅读并同意
                  {onOpenDisclaimer ? (
                    <button type="button" className="login-agree-link" onClick={(e) => { e.preventDefault(); onOpenDisclaimer() }}>《免责声明》</button>
                  ) : (
                    <span>《免责声明》</span>
                  )}
                  和
                  {onOpenPrivacy ? (
                    <button type="button" className="login-agree-link" onClick={(e) => { e.preventDefault(); onOpenPrivacy() }}>《用户隐私》</button>
                  ) : (
                    <span>《用户隐私》</span>
                  )}
                </span>
              </label>

              <button
                type="submit"
                className="login-submit-button"
                disabled={loading || !phone || !password}
              >
                {loading ? '处理中...' : '登录'}
              </button>

              <div className="login-switch login-switch-center">
                <span>还没有账号？</span>
                <button
                  type="button"
                  className="login-switch-button"
                  onClick={() => {
                    if (loading) return
                    setIsSignUp(true)
                    setIsPhoneLogin(true)
                    setPhoneCode('')
                    setConfirmPassword('')
                    setPhoneCodeSent(false)
                    setInviteCode('')
                  }}
                  disabled={loading}
                >
                  立即注册
                </button>
              </div>
            </form>
          )
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-input-group">
              <label className="login-label">邮箱</label>
              <input
                type="email"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
                disabled={loading}
              />
            </div>

            {isSignUp && (
              <div className="login-input-group">
                <label className="login-label">验证码</label>
                <div className="login-verification-wrapper">
                  <input
                    type="text"
                    className="login-input login-verification-input"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="请输入验证码"
                    required={isSignUp}
                    disabled={loading}
                    maxLength={8}
                  />
                  <button
                    type="button"
                    className="login-send-code-button"
                    onClick={handleSendCode}
                    disabled={sendingCode || !email || loading || countdown > 0}
                  >
                    {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}秒后重发` : codeSent ? '重新发送' : '发送验证码'}
                  </button>
                </div>
                <p className="login-email-code-hint">若长时间未收到验证码，请先检查垃圾邮箱或广告邮件</p>
              </div>
            )}

            {isSignUp && (
              <div className="login-input-group">
                <label className="login-label">邀请码（选填）</label>
                <input
                  type="text"
                  className="login-input"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.trim().slice(0, 6))}
                  placeholder="如有邀请码请填写"
                  disabled={loading}
                  maxLength={6}
                />
              </div>
            )}

            <div className="login-input-group">
              <label className="login-label">密码</label>
              <div className="login-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  disabled={loading}
                />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowPassword(!showPassword)
                      e.currentTarget.parentElement?.querySelector('input')?.focus()
                    }}
                    disabled={loading}
                  >
                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
              </div>
              {!isSignUp && (
                <div className="login-forgot-link">
                  <button
                    type="button"
                    className="login-forgot-button"
                    onClick={() => {
                      if (!loading) {
                        setShowForgotPassword(true)
                        setForgotPasswordByPhone(false)
                        setResetPasswordCode('')
                        setResetCountdown(0)
                        setResetCodeSent(false)
                      }
                    }}
                    disabled={loading}
                  >
                    忘记密码？
                  </button>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="login-input-group">
                <label className="login-label">确认密码</label>
                <div className="login-password-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="login-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    required={isSignUp}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowConfirmPassword(!showConfirmPassword)
                      e.currentTarget.parentElement?.querySelector('input')?.focus()
                    }}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </button>
                </div>
              </div>
            )}

            {!isSignUp && (
              <label className="login-agree-row">
                <input
                  type="checkbox"
                  className="login-agree-checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  disabled={loading}
                />
                <span className="login-agree-text">
                  我已阅读并同意
                  {onOpenDisclaimer ? (
                    <button type="button" className="login-agree-link" onClick={(e) => { e.preventDefault(); onOpenDisclaimer() }}>《免责声明》</button>
                  ) : (
                    <span>《免责声明》</span>
                  )}
                  和
                  {onOpenPrivacy ? (
                    <button type="button" className="login-agree-link" onClick={(e) => { e.preventDefault(); onOpenPrivacy() }}>《用户隐私》</button>
                  ) : (
                    <span>《用户隐私》</span>
                  )}
                </span>
              </label>
            )}

            <button
              type="submit"
              className={isSignUp ? 'login-submit-button login-submit-button--compact' : 'login-submit-button'}
              disabled={loading || !email || !password || (isSignUp && (!verificationCode || !confirmPassword))}
            >
              {loading ? '处理中...' : (isSignUp ? '注册' : '登录')}
            </button>

            {!isSignUp && (
              <div className="login-switch login-switch-center">
                <span>还没有账号？</span>
                <button
                  type="button"
                  className="login-switch-button"
                  onClick={() => {
                    if (loading) return
                    setIsSignUp(true)
                    setIsPhoneLogin(false)
                    setVerificationCode('')
                    setConfirmPassword('')
                    setCodeSent(false)
                    setInviteCode('')
                  }}
                  disabled={loading}
                >
                  立即注册
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      <Footer hideSignOut={true} hideSubscription={true} />

      <Modal
        isOpen={showTermsConfirmModal}
        onClose={() => {
          if (!loading) setShowTermsConfirmModal(false)
        }}
        title="用户登录必读"
      >
        <div className="modal-text disclaimer-text">
          <p>登录前，请确认已阅读并同意《免责声明》和《用户隐私》。</p>
          <p>您可以随时在个人中心再次查看和管理相关条款。</p>
          <div className="login-terms-actions">
            <button
              type="button"
              className="login-terms-btn login-terms-btn-secondary"
              onClick={() => {
                if (!loading) setShowTermsConfirmModal(false)
              }}
            >
              我再看看
            </button>
            <button
              type="button"
              className="login-terms-btn login-terms-btn-primary"
              disabled={loading}
              onClick={() => {
                if (loading) return
                setAgreeToTerms(true)
                setShowTermsConfirmModal(false)
                if (isPhoneLogin) void performPhoneLogin()
                else void performSubmit()
              }}
            >
              我已同意并继续
            </button>
          </div>
        </div>
      </Modal>

      {showToast && <Toast message={toastMessage} />}
    </div>
  )
}
