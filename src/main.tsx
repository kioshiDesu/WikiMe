import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SplashScreen } from './components/SplashScreen'
import { router } from './router'
import './index.css'

// Initialize error capture
if (typeof window !== 'undefined') {
  const originalError = console.error.bind(console)
  const originalWarn = console.warn.bind(console)
  
  console.error = (...args) => {
    originalError(...args)
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = 'position:fixed;bottom:4px;right:4px;z-index:9999;background:red;color:white;padding:8px 12px;border-radius:8px;font-size:12px;max-width:300px;word-break:break-word;box-shadow:0 4px 12px rgba(0,0,0,0.3);'
    errorDiv.textContent = message.slice(0, 200)
    document.body.appendChild(errorDiv)
    setTimeout(() => errorDiv.remove(), 5000)
  }
  console.warn = (...args) => {
    originalWarn(...args)
    const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
    const warnDiv = document.createElement('div')
    warnDiv.style.cssText = 'position:fixed;bottom:4px;right:4px;z-index:9999;background:orange;color:white;padding:8px 12px;border-radius:8px;font-size:12px;max-width:300px;word-break:break-word;box-shadow:0 4px 12px rgba(0,0,0,0.3);'
    warnDiv.textContent = message.slice(0, 200)
    document.body.appendChild(warnDiv)
    setTimeout(() => warnDiv.remove(), 5000)
  }
  
  window.addEventListener('unhandledrejection', (e) => {
    const message = e.reason?.message || String(e.reason)
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = 'position:fixed;bottom:4px;right:4px;z-index:9999;background:red;color:white;padding:8px 12px;border-radius:8px;font-size:12px;max-width:300px;word-break:break-word;box-shadow:0 4px 12px rgba(0,0,0,0.3);'
    errorDiv.textContent = message.slice(0, 200)
    document.body.appendChild(errorDiv)
    setTimeout(() => errorDiv.remove(), 5000)
  })
  
  window.addEventListener('error', (e) => {
    const errorDiv = document.createElement('div')
    errorDiv.style.cssText = 'position:fixed;bottom:4px;right:4px;z-index:9999;background:red;color:white;padding:8px 12px;border-radius:8px;font-size:12px;max-width:300px;word-break:break-word;box-shadow:0 4px 12px rgba(0,0,0,0.3);'
    errorDiv.textContent = e.message.slice(0, 200)
    document.body.appendChild(errorDiv)
    setTimeout(() => errorDiv.remove(), 5000)
  })
}

function AppRoot() {
  const [ready, setReady] = useState(false)

  return (
    <>
      {!ready && <SplashScreen onComplete={() => setReady(true)} />}
      <div style={{ opacity: ready ? 1 : 0, transition: 'opacity 400ms ease-out' }}>
        <ErrorBoundary>
          <ThemeProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </div>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
)