import { useState, useCallback } from 'react'

export function useSessionState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key)
      if (saved !== null) return JSON.parse(saved)
    } catch {}
    return initial
  })

  const setAndCache = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
      try { sessionStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])

  const clearCache = useCallback(() => {
    try { sessionStorage.removeItem(key) } catch {}
  }, [key])

  return [state, setAndCache, clearCache]
}
