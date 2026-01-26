import { createPortal } from 'react-dom'
import './PriceCalculator.css'

interface ToastProps {
  message: string
}

/**
 * Toast 提示组件
 * 使用 Portal 渲染到 body，确保不受父元素 transform 影响
 */
export const Toast = ({ message }: ToastProps) => {
  const toastContent = (
    <div className="toast">
      <div className="toast-content">{message}</div>
    </div>
  )

  // 使用 Portal 将 Toast 渲染到 body，避免受 Modal 的 transform 影响
  return createPortal(toastContent, document.body)
}
