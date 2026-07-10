import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(el => {
    return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.disabled && getComputedStyle(el).visibility !== 'hidden'
  })
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      setTimeout(() => panelRef.current?.focus(), 0)
    } else {
      document.body.style.overflow = ''
      previouslyFocused.current?.focus()
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const focusable = getFocusableElements(panelRef.current!)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    if (open) {
      window.addEventListener('keydown', handleKeyDown)
      panelRef.current?.focus()
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="fixed inset-0 bg-black/40" onClick={() => onClose()} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto shadow-xl animate-slide-up outline-none">
        {title && (
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {title}
          </h2>
        )}
        <div className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          {children}
        </div>
        {footer && (
          <div className="mt-6 flex gap-3 justify-end">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmText = 'Delete', cancelText = 'Cancel', destructive = true,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
              destructive
                ? 'bg-red-500 active:bg-red-600'
                : 'bg-teal-500 active:bg-teal-600'
            }`}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  )
}