import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ToastState {
  message: string
  id: number
  visible: boolean
}

// Module-level singleton — one toast at a time
let toastCallback: ((message: string) => void) | null = null

export function useToast() {
  const show = useCallback((message: string) => {
    toastCallback?.(message)
  }, [])
  return { show }
}

export function ToastProvider() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    toastCallback = (message: string) => {
      // Clear any pending dismiss
      if (timerRef.current) clearTimeout(timerRef.current)

      const id = Date.now()
      setToast({ message, id, visible: true })

      // Auto-dismiss after 3.2s
      timerRef.current = setTimeout(() => {
        setToast((prev) => prev?.id === id ? { ...prev, visible: false } : prev)
        // Remove from DOM after fade-out transition
        setTimeout(() => {
          setToast((prev) => prev?.id === id ? null : prev)
        }, 300)
      }, 3200)
    }

    return () => {
      toastCallback = null
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!toast) return null

  return createPortal(
    <div
      className={[
        'fixed left-5 right-5 mx-auto max-w-[320px]',
        'bg-ink text-parchment',
        'rounded-[50px] px-5 py-3',
        'text-[0.88rem] text-center',
        'z-[10000] pointer-events-none',
        'transition-all duration-300',
        toast.visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2',
      ].join(' ')}
      style={{ bottom: '90px', boxShadow: '0 16px 56px rgba(26,18,8,.2)' }}
    >
      {toast.message}
    </div>,
    document.body
  )
}

// Named export alias for standalone use
export const Toast = ToastProvider
