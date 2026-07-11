import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface ThemePreset {
  id: string
  name: string
  icon: string
  isDark: boolean
}

export const themePresets: ThemePreset[] = [
  { id: 'light', name: 'Light', icon: 'faSun', isDark: false },
  { id: 'dark', name: 'Dark', icon: 'faMoon', isDark: true },
  { id: 'sepia', name: 'Sepia', icon: 'faBook', isDark: false },
  { id: 'forest', name: 'Forest', icon: 'faTree', isDark: true },
  { id: 'ocean', name: 'Ocean', icon: 'faWater', isDark: true },
]

interface ThemeContextType {
  theme: ThemePreset
  setTheme: (id: string) => void
}

const ThemeContext = createContext<ThemeContextType>(null!)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreset>(() => {
    const saved = localStorage.getItem('wikime-theme')
    if (saved) {
      const found = themePresets.find(t => t.id === saved)
      if (found) return found
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? themePresets[1] : themePresets[0]
  })

  const setTheme = (id: string) => {
    const preset = themePresets.find(t => t.id === id)
    if (preset) setThemeState(preset)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme.isDark)
    document.documentElement.setAttribute('data-theme', theme.id)
    localStorage.setItem('wikime-theme', theme.id)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
