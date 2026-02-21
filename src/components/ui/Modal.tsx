import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

type ModalVariant = 'bottom-sheet' | 'center'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  variant?: ModalVariant
  title?: string
  subtitle?: string
  children: ReactNode
}

export function Modal({
  isOpen,
  onClose,
  variant = 'bottom-sheet',
  title,
  subtitle,
  children,
}: ModalProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const isCenter = variant === 'center'

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div
      className={[
        'fixed inset-0 z-[1000]',
        'flex',
        isCenter ? 'items-center justify-center' : 'items-end',
        'transition-opacity duration-300',
      ].join(' ')}
      style={{ background: 'rgba(26,18,8,.5)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
    >
      <div
        className={[
          'bg-parchment w-full max-w-[480px] sm:max-w-lg lg:max-w-xl',
          'max-h-[92vh] overflow-y-auto',
          'px-5 pb-10 pt-6',
          'animate-sheet-up',
          isCenter
            ? 'rounded-[28px] mx-5'
            : 'rounded-t-[28px]',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle — only for bottom-sheet */}
        {!isCenter && (
          <div className="w-10 h-1 bg-parchment-deep rounded-full mx-auto mb-5" />
        )}

        {title && (
          <h2 className="text-[1.4rem] font-semibold text-ink mb-1 font-display">{title}</h2>
        )}
        {subtitle && (
          <p className="text-[0.88rem] text-ink-light mb-5">{subtitle}</p>
        )}

        {children}
      </div>
    </div>,
    document.body
  )
}
