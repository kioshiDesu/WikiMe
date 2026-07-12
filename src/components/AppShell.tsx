import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faMoon, faSun, faBook, faTree, faWater, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useHeader } from '../context/HeaderContext'
import { useTheme, themePresets } from '../context/ThemeContext'
import { PageTransition } from './PageTransition'
import { Modal } from './Modal'
import { db, DEFAULT_TRASH_DAYS } from '../db/db'

const themeIcons: Record<string, any> = {
  faSun, faMoon, faBook, faTree, faWater,
}

export function AppShell() {
  const { config } = useHeader()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [showThemePicker, setShowThemePicker] = useState(false)

  useEffect(() => {
    window.__handleAndroidBack = () => {
      if (location.pathname === '/') {
        window.history.pushState(null, '', window.location.href)
        return
      }
      if (config.onBack) config.onBack()
      else navigate('/')
    }
    return () => { delete window.__handleAndroidBack }
  }, [config.onBack, navigate, location.pathname])

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash
      const path = hash.startsWith('#/') ? hash.slice(1) : hash
      if (path === '/' || path === '' || path === '#') {
        window.history.pushState(null, '', window.location.href)
      }
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    const init = async () => {
      const now = Date.now()
      const all = await db.entries.toArray()
      for (const e of all) {
        if (!e.deletedAt) continue
        const deadline = new Date(e.deletedAt).getTime() + (e.trashDays || DEFAULT_TRASH_DAYS) * 86400000
        if (now >= deadline) {
          await db.searchIndex.where('entryId').equals(e.id!).delete()
          await db.versions.where('entryId').equals(e.id!).delete()
          await db.entries.delete(e.id!)
        }
      }
      const mod = await import('../utils/searchIndex')
      mod.setRebuildingIndex(true)
      try {
        await mod.rebuildAllSearchIndexes(db)
      } catch (err) {
        console.error('Startup index rebuild failed:', err)
      } finally {
        mod.setRebuildingIndex(false)
      }
    }
    init()
  }, [])

  const isHome = location.pathname === '/'
  const showBack = config.showBack && !isHome

  return (
    <div className="flex flex-col h-dvh bg-surface">
      <header className="flex-none flex items-center gap-3 px-4 h-12 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 z-30 transition-all">
        {showBack && (
          <button
            onClick={() => {
              if (config.onBack) config.onBack()
              else navigate('/')
            }}
            className="min-w-10 min-h-10 flex items-center justify-center -ml-2 rounded-xl text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-all"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
          </button>
        )}
          {isHome ? (
            <h1 className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100 truncate transition-all">WikiMe</h1>
          ) : (
            <div className="flex-1" />
          )}
        <div className="flex items-center gap-1">
          {isHome && (
            <button
              onClick={() => navigate('/trash')}
              className="min-w-10 min-h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-all"
              title="Trash"
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowThemePicker(true)}
            className="min-w-10 min-h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-all"
            title="Theme"
          >
            <FontAwesomeIcon icon={themeIcons[theme.icon] || faSun} className="w-4 h-4" />
          </button>
          {config.rightAction && (
            <>{config.rightAction}</>
          )}
        </div>
      </header>

      <PageTransition><Outlet /></PageTransition>

      <Modal open={showThemePicker} onClose={() => setShowThemePicker(false)} title="Choose Theme">
        <div className="space-y-1">
          {themePresets.map(p => (
            <button
              key={p.id}
              onClick={() => { setTheme(p.id); setShowThemePicker(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                theme.id === p.id
                  ? 'bg-accent-50 border-accent'
                  : 'active:bg-gray-100 dark:active:bg-gray-800'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                p.isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-600'
              }`}>
                <FontAwesomeIcon icon={themeIcons[p.icon] || faSun} className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <div className={`text-sm font-medium ${
                  theme.id === p.id ? 'text-accent-dark' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {p.name}
                </div>
              </div>
              {theme.id === p.id && (
                <div className="w-2 h-2 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
