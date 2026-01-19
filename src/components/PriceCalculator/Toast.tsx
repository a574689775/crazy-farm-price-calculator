import './PriceCalculator.css'

interface ToastProps {
  message: string
}

/**
 * Toast 提示组件
 */
export const Toast = ({ message }: ToastProps) => {
  return (
    <div className="toast">
      <div className="toast-content">{message}</div>
    </div>
  )
}
