import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { db } from '../db/db'

declare global {
  interface Window {
    __handleAndroidBack?: () => void
  }
}

interface HistoryEntry {
  pathname: string
}

interface NavigationHistoryContextType {
  goBack: () => void
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType>(null!)

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const stack = useRef<HistoryEntry[]>([])
  const isBackNav = useRef(false)
  const locked = useRef(false)

  useEffect(() => {
    if (stack.current.length === 0) {
      stack.current.push({ pathname: location.pathname })
    }
    window.__handleAndroidBack = () => goBack()
    return () => { delete window.__handleAndroidBack }
  }, [])

  useEffect(() => {
    if (isBackNav.current) {
      isBackNav.current = false
      return
    }
    const current = location.pathname
    if (current !== stack.current[stack.current.length - 1]?.pathname) {
      stack.current.push({ pathname: current })
    }
  }, [location.pathname])

  const goBack = useCallback(async () => {
    if (locked.current) return
    locked.current = true
    try {
      stack.current.pop()

      while (stack.current.length > 0) {
        const prev = stack.current[stack.current.length - 1]
        const match = prev.pathname.match(/^\/entry\/(\d+)$/)
        if (match) {
          const entryId = Number(match[1])
          const entry = await db.entries.get(entryId)
          if (!entry || entry.deletedAt != null) {
            stack.current.pop()
            continue
          }
        }
        isBackNav.current = true
        navigate(prev.pathname)
        locked.current = false
        return
      }

      isBackNav.current = true
      navigate('/')
    } finally {
      locked.current = false
    }
  }, [navigate])

  return (
    <NavigationHistoryContext.Provider value={{ goBack }}>
      {children}
    </NavigationHistoryContext.Provider>
  )
}

export function useNavigationHistory() {
  return useContext(NavigationHistoryContext)
}
