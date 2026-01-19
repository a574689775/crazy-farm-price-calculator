import React from 'react'
import './GradientButton.css'

interface GradientButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
  disabled?: boolean
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  className = '',
  style = {},
  disabled = false,
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      className={`gradient-button ${disabled ? 'disabled' : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={style}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </div>
  )
}
