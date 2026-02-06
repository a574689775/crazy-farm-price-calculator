import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LeftOutlined } from '@ant-design/icons'
import './Modal.css'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  onBack?: () => void
  /** 可选：给 modal 内容容器追加的 class，用于覆盖宽度等样式 */
  contentClassName?: string
}

export const Modal = ({ isOpen, onClose, title, children, onBack, contentClassName }: ModalProps) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      setIsAnimating(false)
      // 使用 setTimeout 确保 DOM 已经渲染
      const timer = setTimeout(() => {
        setIsAnimating(true)
      }, 10)
      return () => clearTimeout(timer)
    } else {
      if (shouldRender) {
        setIsAnimating(false)
        // 等待动画结束后移除 DOM
        const timer = setTimeout(() => {
          setShouldRender(false)
        }, 300) // 与 CSS 动画时长一致
        return () => clearTimeout(timer)
      }
    }
  }, [isOpen, shouldRender])

  const overlayClass = isOpen && isAnimating 
    ? 'modal-overlay-enter' 
    : isOpen && !isAnimating 
    ? 'modal-overlay-initial' 
    : 'modal-overlay-exit'
  
  const contentClass = isOpen && isAnimating 
    ? 'modal-content-enter' 
    : isOpen && !isAnimating 
    ? 'modal-content-initial' 
    : 'modal-content-exit'

  const modalContent = (
    <div 
      className={`modal-overlay ${overlayClass}`}
      onClick={onClose}
    >
      <div 
        className={`modal-content ${contentClass}${contentClassName ? ` ${contentClassName}` : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header-fixed">
            {onBack && (
              <span className="modal-back-link" onClick={onBack}>
                <LeftOutlined />
              </span>
            )}
            <div className="modal-title-wrapper">
              <img 
                src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/田园阿公.png" 
                alt="阿公" 
                className="modal-title-image"
              />
              <h3 className="modal-title">{title}</h3>
            </div>
          </div>
        )}
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-body">
          <div className="modal-body-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  )

  // 使用 Portal 将 Modal 渲染到 body，避免受业务 DOM 样式影响
  if (!shouldRender) return null
  
  return createPortal(modalContent, document.body)
}

