import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'

export interface ContextMenuItem {
  icon: IconDefinition
  label: string
  destructive?: boolean
  onClick: () => void
}

interface ContextMenuProps {
  open: boolean
  onClose: () => void
  items: ContextMenuItem[]
  triggerRef?: React.RefObject<HTMLElement>
}

export function ContextMenu({ open, onClose, items, triggerRef }: ContextMenuProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      const timer = setTimeout(() => {
        const first = listRef.current?.querySelector('button')
        first?.focus()
      }, 50)
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = ''
        if (triggerRef?.current) {
          triggerRef.current.focus()
        }
      }
    } else {
      document.body.style.overflow = ''
      if (triggerRef?.current) {
        triggerRef.current.focus()
      }
    }
  }, [open, triggerRef])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div
        ref={listRef}
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-8 shadow-xl animate-slide-up"
        onClick={e => e.stopPropagation()}
        role="menu"
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
        <div className="flex flex-col gap-1">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); onClose() }}
              className={`flex items-center gap-3 w-full p-3 rounded-xl text-sm font-medium transition-colors ${
                item.destructive
                  ? 'text-red-500 active:bg-red-50 dark:active:bg-red-950'
                  : 'text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-800'
              }`}
              role="menuitem"
              tabIndex={0}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                item.destructive
                  ? 'bg-red-50 dark:bg-red-950'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <FontAwesomeIcon icon={item.icon} className={`w-4 h-4 ${item.destructive ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} />
              </div>
              {item.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-3 py-3 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  )
}
