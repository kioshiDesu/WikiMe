import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faMoon, faSun, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useHeader } from '../context/HeaderContext'
import { useNavigationHistory } from '../context/NavigationHistoryContext'
import { useTheme } from '../context/ThemeContext'
import { PageTransition } from './PageTransition'
import { db, DEFAULT_TRASH_DAYS } from '../db/db'

export function AppShell() {
  const { config } = useHeader()
  const { goBack } = useNavigationHistory()
  const { dark, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

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
    <div className="flex flex-col h-dvh bg-gray-50 dark:bg-gray-950">
      <header className="flex-none flex items-center gap-3 px-4 h-12 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 z-30 transition-all">
        {showBack && (
          <button
            onClick={() => {
              if (config.onBack) config.onBack()
              else goBack()
            }}
            className="min-w-10 min-h-10 flex items-center justify-center -ml-2 rounded-xl text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-all"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
          </button>
        )}
        <h1 className="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100 truncate transition-all">
          {config.title}
        </h1>
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
            onClick={toggle}
            className="min-w-10 min-h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-all"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <FontAwesomeIcon icon={dark ? faMoon : faSun} className="w-4 h-4" />
          </button>
          {config.rightAction && (
            <>{config.rightAction}</>
          )}
        </div>
      </header>

      <PageTransition><Outlet /></PageTransition>
    </div>
  )
}
