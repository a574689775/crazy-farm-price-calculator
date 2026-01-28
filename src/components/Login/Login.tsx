import { useState, useEffect } from 'react'
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import { signIn, sendResetPasswordCode, verifyResetPasswordCode, sendEmailOtp, verifyEmailOtp } from '@/utils/supabase'
import { translateSupabaseError } from '@/utils/errorMessages'
import { Toast } from '../PriceCalculator/Toast'
import { Footer } from '../Footer'
import './Login.css'

interface LoginProps {
  onLoginSuccess: () => void
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [resetPasswordCode, setResetPasswordCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [resetCodeSent, setResetCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [resetCountdown, setResetCountdown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // 注册验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 找回密码验证码倒计时
  useEffect(() => {
    if (resetCountdown > 0) {
      const timer = setTimeout(() => {
        setResetCountdown(resetCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resetCountdown])

  const handleSendCode = async () => {
    if (!email) {
      setToastMessage('请先输入邮箱地址')
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
      return
    }

    setSendingCode(true)

    try {
      await sendEmailOtp(email)
      setCodeSent(true)
      setCountdown(60)
      setToastMessage('验证码已发送，请查收邮箱')
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
    } catch (err: any) {
      const errorMsg = translateSupabaseError(err)
      setToastMessage(errorMsg)
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        setToastMessage('注册成功！正在登录...')
        setShowToast(true)
        setTimeout(() => {
          setShowToast(false)
          onLoginSuccess()
        }, 1500)
      } else {
        await signIn(email, password)
        onLoginSuccess()
      }
    } catch (err: any) {
      const errorMsg = translateSupabaseError(err)
      setToastMessage(errorMsg)
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
      setLoading(false)
    }
  }

  const handleSendResetCode = async () => {
    if (!email) {
      setToastMessage('请先输入邮箱地址')
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
      return
    }

    setSendingCode(true)

    try {
      await sendResetPasswordCode(email)
      setResetCodeSent(true)
      setResetCountdown(60)
      setToastMessage('验证码已发送，请查收邮箱')
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
    } catch (err: any) {
      const errorMsg = translateSupabaseError(err)
      setToastMessage(errorMsg)
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
    } finally {
      setSendingCode(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证密码是否一致
    if (newPassword !== confirmNewPassword) {
      setToastMessage('两次输入的密码不一致')
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
      setLoading(false)
      return
    }

    if (!resetPasswordCode) {
      setToastMessage('请输入验证码')
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
      setLoading(false)
      return
    }

    if (!newPassword) {
      setToastMessage('请输入新密码')
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      await verifyResetPasswordCode(email, resetPasswordCode, newPassword)
      setToastMessage('密码重置成功！正在登录...')
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
        onLoginSuccess()
      }, 1500)
    } catch (err: any) {
      const errorMsg = translateSupabaseError(err)
      setToastMessage(errorMsg)
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <img 
          src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/蛋仔.png" 
          alt="蛋仔" 
          className="login-top-image"
        />
        <img 
          src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/hi.png" 
          alt="hi" 
          className="login-hi-image"
        />
        <div className="login-header">
          <h2 className="login-title">
            {showForgotPassword ? '重置密码' : (isSignUp ? '注册账号' : '欢迎登录')}
          </h2>
        </div>

        {showForgotPassword ? (
          <form className="login-form" onSubmit={handleForgotPassword}>
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
              <p className="login-limit-hint">若长时间未收到验证码，请先检查垃圾邮箱或广告邮件。</p>
            </div>

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
              className="login-submit-button"
              disabled={loading || !email || !resetPasswordCode || !newPassword || !confirmNewPassword}
            >
              {loading ? '处理中...' : '重置密码'}
            </button>

            <div className="login-switch">
              <button
                type="button"
                className="login-switch-button"
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetPasswordCode('')
                  setNewPassword('')
                  setConfirmNewPassword('')
                  setResetCodeSent(false)
                }}
                disabled={loading}
              >
                返回登录
              </button>
            </div>
          </form>
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
                <p className="login-limit-hint">若长时间未收到验证码，请先检查垃圾邮箱或广告邮件</p>
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

            <button
              type="submit"
              className="login-submit-button"
              disabled={loading || !email || !password || (isSignUp && (!verificationCode || !confirmPassword))}
            >
              {loading ? '处理中...' : (isSignUp ? '注册' : '登录')}
            </button>

            <div className={isSignUp ? 'login-switch-center' : 'login-actions'}>
              {!isSignUp && (
                <div className="login-forgot-link">
                  <button
                    type="button"
                    className="login-forgot-button"
                  onClick={() => {
                    setShowForgotPassword(true)
                  }}
                    disabled={loading}
                  >
                    忘记密码？
                  </button>
                </div>
              )}
              <div className="login-switch">
                <span>{isSignUp ? '已有账号？' : '还没有账号？'}</span>
                <button
                  type="button"
                  className="login-switch-button"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setVerificationCode('')
                    setConfirmPassword('')
                    setCodeSent(false)
                  }}
                  disabled={loading}
                >
                  {isSignUp ? '去登录' : '去注册'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <Footer hideSignOut={true} />

      {showToast && <Toast message={toastMessage} />}
    </div>
  )
}
