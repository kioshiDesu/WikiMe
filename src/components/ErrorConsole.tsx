import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faCopy, faBug, faTrash, faDownload } from '@fortawesome/free-solid-svg-icons'

/** @typedef {{ id: number; message: string; stack?: string; timestamp: Date; type: 'error' | 'warning' | 'info' }} ErrorInfo */

const MAX_ERRORS = 100
let errorListeners = []
let errorIdCounter = 0

export function captureError(message, stack, type = 'error') {
  const error = { id: ++errorIdCounter, message, stack, timestamp: new Date(), type }
  errorListeners.forEach(fn => fn(error))
}

export function subscribeToErrors(fn) {
  errorListeners.push(fn)
  return () => { errorListeners = errorListeners.filter(l => l !== fn) }
}

export function ErrorConsoleProvider({ children }) {
  const [errors, setErrors] = useState([])
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    initErrorCapture()
    const unsubscribe = subscribeToErrors((error) => {
      setErrors(prev => [error, ...prev.slice(0, 99)])
    })
    return unsubscribe
  }, [])

  const filteredErrors = errors.filter(e => filter === 'all' || e.type === filter)

  const copyAll = useCallback(() => {
    const text = errors.map(e => `[${e.timestamp.toISOString()}] ${e.type.toUpperCase()}: ${e.message}\n${e.stack || ''}`).join('\n---\n')
    if (navigator.clipboard) { navigator.clipboard.writeText(text) }
  }, [errors])

  const copyOne = useCallback((error) => {
    const text = `[${error.timestamp.toISOString()}] ${error.type.toUpperCase()}: ${error.message}\n${error.stack || ''}`
    if (navigator.clipboard) { navigator.clipboard.writeText(text) }
  }, [])

  const downloadAll = useCallback(() => {
    const text = errors.map(e => `[${e.timestamp.toISOString()}] ${e.type.toUpperCase()}: ${e.message}\n${e.stack || ''}`).join('\n---\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wikime-errors-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [errors])

  const filteredCount = errors.filter(e => filter === 'all' || e.type === filter).length
  const errorCount = errors.filter(e => e.type === 'error').length
  const warningCount = errors.filter(e => e.type === 'warning').length

  if (!open && errors.length === 0) return children

  return (
    <>
      {children}
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 max-h-[90vh] rounded-2xl shadow-xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faBug} className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Console Errors ({errors.length})</h3>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={filter} 
                  onChange={e => setFilter(e.target.value)}
                  className="px-2 py-1 text-xs border rounded bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <option value="all">All ({errors.length})</option>
                  <option value="error">Errors ({errors.filter(e => e.type === 'error').length})</option>
                  <option value="warning">Warnings ({errors.filter(e => e.type === 'warning').length})</option>
                </select>
                <button onClick={() => setOpen(false)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-3">
              {filteredErrors.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No errors to display</p>
              ) : (
                errors.filter(e => filter === 'all' || e.type === filter).map((error, i) => (
                  <div key={error.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            error.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            error.type === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {error.type.toUpperCase()}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 font-mono">
                            {error.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">{error.message}</p>
                        {error.stack && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">Stack trace</summary>
                            <pre className="mt-1 text-[10px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto whitespace-pre-wrap">{error.stack}</pre>
                          </details>
                        )}
                      </div>
                      <button
                        onClick={() => copyOne(error)}
                        className="p-1.5 rounded text-gray-500 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                        title="Copy this error"
                      >
                        <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2 sticky bottom-0 bg-white dark:bg-gray-900">
              <button
                onClick={() => { setErrors([]); setOpen(false) }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-500"
              >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4 mr-1" /> Clear All
              </button>
              <button
                onClick={downloadAll}
                className="px-3 py-1.5 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={copyAll}
                className="px-3 py-1.5 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
                Copy All
              </button>
            </div>
          </div>,
        document.body
      )}
      {errors.length > 0 && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-xl shadow-lg animate-bounce hover:bg-red-600 transition-colors"
        >
          <FontAwesomeIcon icon={faBug} className="w-4 h-4" />
          <span className="text-sm font-medium">{errors.length}</span>
        </button>
      )}
    </>
  )
}

export function initErrorCapture() {
  if (typeof window === 'undefined') return
  
  const originalError = console.error.bind(console)
  const originalWarn = console.warn.bind(console)
  
  console.error = (...args) => {
    originalError(...args)
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
    captureError(message, new Error().stack, 'error')
  }
  console.warn = (...args) => {
    originalWarn(...args)
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
    captureError(message, new Error().stack, 'warning')
  }
  
  window.addEventListener('unhandledrejection', (e) => {
    captureError(e.reason?.message || String(e.reason), e.reason?.stack, 'error')
  })
  
  window.addEventListener('error', (e) => {
    captureError(e.message, e.error?.stack, 'error')
  })
}