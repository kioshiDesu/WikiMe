import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  persistent?: boolean
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextType>(null!)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = nextId++
    const persistent = type === 'error'
    setToasts(prev => [...prev, { id, message, type, persistent }])
    if (!persistent) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 3000)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-28 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.persistent ? 'alert' : undefined}
            onClick={t.persistent ? () => dismiss(t.id) : undefined}
            className={`pointer-events-auto px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg animate-slide-up ${
              t.type === 'success'
                ? 'bg-green-500'
                : t.type === 'error'
                  ? 'bg-red-500'
                  : 'bg-gray-800 dark:bg-gray-700'
            } ${t.persistent ? 'cursor-pointer pr-8 relative' : ''}`}
          >
            {t.message}
            {t.persistent && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 text-xs">tap to dismiss</span>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
