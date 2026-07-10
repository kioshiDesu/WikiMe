import { createContext, useContext, useState, type ReactNode } from 'react'
import type { HeaderConfig } from '../types'

interface HeaderContextType {
  config: HeaderConfig
  setConfig: (config: HeaderConfig) => void
}

const HeaderContext = createContext<HeaderContextType>(null!)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderConfig>({ title: 'WikiMe' })

  return (
    <HeaderContext.Provider value={{ config, setConfig }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  const ctx = useContext(HeaderContext)
  if (!ctx) throw new Error('useHeader must be used within HeaderProvider')
  return ctx
}
