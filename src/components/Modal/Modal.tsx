import { ReactNode } from 'react'
import './Modal.css'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header-fixed">
            <img 
              src="https://now.bdstatic.com/stash/v1/5249c21/soundMyst/0ca7f11/carzyfarm/田园阿公.png" 
              alt="阿公" 
              className="modal-title-image"
            />
            <h3 className="modal-title">{title}</h3>
          </div>
        )}
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

