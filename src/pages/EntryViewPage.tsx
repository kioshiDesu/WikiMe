import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThumbtack, faCalendar, faFolderOpen, faPencil, faTrash, faSearch, faChevronUp, faChevronDown, faXmark, faClock, faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import DOMPurify from 'dompurify'
import { useHeader } from '../context/HeaderContext'
import { useEntries } from '../hooks/useEntries'
import { addRecentEntry } from '../utils/recent'
import { useToast } from '../context/ToastContext'
import { Modal, ConfirmModal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { ContentSkeleton } from '../components/SkeletonLoader'
import { iconLookup } from '../utils/icons'

function stripHtml(html: string) {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.textContent || ''
}
import { db } from '../db/db'
import type { Category, Entry } from '../types'

export function EntryViewPage() {
  const { id } = useParams<{ id: string }>()
  const entryId = Number(id)
  const { updateEntry, trashEntry, getVersions, restoreVersion, saveVersion } = useEntries()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { setConfig } = useHeader()

  const [entry, setEntry] = useState<Entry | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [showMove, setShowMove] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<any[]>([])

  const [showFind, setShowFind] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [currentMatch, setCurrentMatch] = useState(0)
  const [matchCount, setMatchCount] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const matchElementsRef = useRef<HTMLElement[]>([])

  const highlightsInElement = (root: HTMLElement, query: string) => {
    const textNodes: Text[] = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

    const marks: HTMLElement[] = []
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')

    for (const node of textNodes) {
      const text = node.textContent || ''
      regex.lastIndex = 0
      if (!regex.test(text)) continue

      regex.lastIndex = 0
      const fragment = document.createDocumentFragment()
      let lastIndex = 0
      let match

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
        }
        const mark = document.createElement('mark')
        mark.className = 'find-highlight'
        mark.textContent = match[0]
        fragment.appendChild(mark)
        marks.push(mark)
        lastIndex = match.index + match[0].length
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
      }

      if (fragment.childNodes.length > 0) {
        node.parentNode?.replaceChild(fragment, node)
      }
    }

    matchElementsRef.current = marks
    setMatchCount(marks.length)
    if (marks.length > 0) {
      marks[0].className = 'find-current'
      marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
      setCurrentMatch(1)
    } else {
      setCurrentMatch(0)
    }
  }

  const goToMatch = (index: number) => {
    const marks = matchElementsRef.current
    if (index < 0 || index >= marks.length) return
    marks.forEach(m => m.className = 'find-highlight')
    marks[index].className = 'find-current'
    marks[index].scrollIntoView({ behavior: 'smooth', block: 'center' })
    setCurrentMatch(index + 1)
  }

  useLayoutEffect(() => {
    if (!contentRef.current || !entry) return
    const sanitized = DOMPurify.sanitize(entry.contentHtml)
    contentRef.current.innerHTML = sanitized
    if (showFind && findQuery.trim()) {
      highlightsInElement(contentRef.current, findQuery)
    }
  }, [entry?.contentHtml, entry?.id, showFind, findQuery])

  useEffect(() => {
    const el = contentRef.current
    if (!el || !entry) return
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('a')) return
      const li = t.closest('li[data-type="taskItem"]')
      if (!li) return
      const checked = li.getAttribute('data-checked') === 'true'
      li.setAttribute('data-checked', checked ? 'false' : 'true')
      const cb = li.querySelector<HTMLInputElement>('input[type="checkbox"]')
      if (cb) cb.checked = !checked
      db.entries.update(entry.id, { contentHtml: el.innerHTML, updatedAt: new Date() })
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [entry?.id, entry?.contentHtml])

  useEffect(() => {
    if (!showFind) {
      setFindQuery('')
      setCurrentMatch(0)
      setMatchCount(0)
    }
  }, [showFind])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFind) {
        setShowFind(false)
        e.preventDefault()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !showFind) {
        setShowFind(true)
        e.preventDefault()
      }
      if (showFind && e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          goToMatch((currentMatch - 2 + matchCount) % matchCount)
        } else {
          goToMatch(currentMatch % matchCount)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showFind, currentMatch, matchCount])

  useEffect(() => {
    db.entries.get(entryId).then(data => {
      if (data) {
        const d = { ...data, contentHtml: data.contentHtml }
        setEntry(d)
        addRecentEntry({ id: d.id, title: d.title, categoryId: d.categoryId })
        saveVersion(d.id!, d.title, d.contentHtml)
      } else {
        showToast('This entry no longer exists', 'error')
        navigate('/', { replace: true })
        return
      }
      setLoading(false)
    })
  }, [entryId, saveVersion])

  useEffect(() => {
    if (!entry) return
    db.categories.get(entry.categoryId).then(data => {
      if (data) setCategory(data)
    })
  }, [entry?.categoryId])

  useEffect(() => {
    db.categories.toArray().then(data => {
      setAllCategories(data)
    })
  }, [])

  useEffect(() => {
    if (!entry) return
    setConfig({
      title: entry.title || 'Untitled',
      showBack: true,
      rightAction: (
        <button
          onClick={() => {
            getVersions(entry.id!).then(setVersions)
            setShowVersions(true)
          }}
          className="min-w-10 min-h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-all"
          title="Version history"
        >
          <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
        </button>
      ),
    })
  }, [setConfig, entry, navigate, getVersions])

  if (loading || !entry) {
    return <ContentSkeleton />
  }

  const handleTrash = async () => {
    await trashEntry(entryId)
    showToast('Moved to trash', 'success')
    navigate(`/category/${entry.categoryId}`)
  }

  const handleMove = async (newCategoryId: number) => {
    await updateEntry(entryId, { categoryId: newCategoryId })
    setEntry({ ...entry, categoryId: newCategoryId })
    const cat = allCategories?.find(c => c.id === newCategoryId)
    showToast(`Moved to ${cat?.name || 'category'}`, 'success')
    setShowMove(false)
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1 select-none">
        {entry.title || 'Untitled'}
      </h1>
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
        {category && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {category.name}
            </span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" />
          {formatDate(entry.updatedAt)}
        </span>
      </div>

      {showFind && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-gray-100 dark:bg-gray-800/80 rounded-xl">
          <input
            type="text"
            value={findQuery}
            onChange={e => setFindQuery(e.target.value)}
            placeholder="Find in page..."
            className="flex-1 bg-gray-50 dark:bg-gray-900 px-2.5 py-1.5 rounded-lg text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            autoFocus
          />
          {matchCount > 0 && (
            <span className="text-xs text-gray-400 whitespace-nowrap tabular-nums">{currentMatch}/{matchCount}</span>
          )}
          {findQuery.trim() && matchCount === 0 && (
            <span className="text-xs text-red-400">No results</span>
          )}
          <button
            onClick={() => goToMatch((currentMatch - 2 + matchCount) % matchCount)}
            disabled={matchCount === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 bg-gray-50 dark:bg-gray-900 active:bg-gray-200 dark:active:bg-gray-700 disabled:opacity-30 transition-all"
          >
            <FontAwesomeIcon icon={faChevronUp} className="w-3 h-3" />
          </button>
          <button
            onClick={() => goToMatch(currentMatch % matchCount)}
            disabled={matchCount === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 bg-gray-50 dark:bg-gray-900 active:bg-gray-200 dark:active:bg-gray-700 disabled:opacity-30 transition-all"
          >
            <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowFind(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 bg-gray-50 dark:bg-gray-900 active:bg-gray-200 dark:active:bg-gray-700 transition-all"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
          </button>
        </div>
      )}

      <div ref={contentRef} className="entry-content pt-4" style={category ? { '--blockquote-color': category.color } as React.CSSProperties : undefined} />
      {entry.contentHtml && (
        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          {(() => {
            const text = entry.contentHtml.replace(/<[^>]*>/g, '')
            const words = text.trim() ? text.trim().split(/\s+/).length : 0
            return `${words} ${words === 1 ? 'word' : 'words'} · ${text.length} ${text.length === 1 ? 'char' : 'chars'}`
          })()}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg">
        <div className="max-w-lg mx-auto flex items-center justify-around px-4 py-2">
          <button
            onClick={() => setShowFind(true)}
            className={`flex flex-col items-center gap-0.5 min-w-16 py-2 rounded-xl transition-colors ${
              showFind ? 'text-teal-500' : 'text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
            }`}
          >
            <FontAwesomeIcon icon={faSearch} className="w-5 h-5" />
            <span className="text-[10px] font-medium">Find</span>
          </button>
          <button
            onClick={async () => {
              const next = !entry.pinned
              await updateEntry(entryId, { pinned: next })
              setEntry({ ...entry, pinned: next })
              showToast(next ? 'Pinned' : 'Unpinned', 'info')
            }}
            className="flex flex-col items-center gap-0.5 min-w-16 py-2 rounded-xl text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
          >
            <FontAwesomeIcon icon={faThumbtack} className={`w-5 h-5 ${entry.pinned ? 'text-teal-500 rotate-45' : ''}`} />
            <span className="text-[10px] font-medium">{entry.pinned ? 'Pinned' : 'Pin'}</span>
          </button>
          <button
            onClick={() => setShowMove(true)}
            className="flex flex-col items-center gap-0.5 min-w-16 py-2 rounded-xl text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
          >
            <FontAwesomeIcon icon={faFolderOpen} className="w-5 h-5" />
            <span className="text-[10px] font-medium">Move</span>
          </button>
          <button
            onClick={() => navigate(`/entry/${entryId}/edit`)}
            className="flex flex-col items-center gap-0.5 min-w-16 py-2 rounded-xl text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
          >
            <FontAwesomeIcon icon={faPencil} className="w-5 h-5" />
            <span className="text-[10px] font-medium">Edit</span>
          </button>
          <button
            onClick={handleTrash}
            className="flex flex-col items-center gap-0.5 min-w-16 py-2 rounded-xl text-red-500 active:bg-red-50 dark:active:bg-red-950 transition-colors"
          >
            <FontAwesomeIcon icon={faTrash} className="w-5 h-5" />
            <span className="text-[10px] font-medium">Trash</span>
          </button>
        </div>
      </div>

      <style>{`
        .find-highlight { background: #fde68a; border-radius: 2px; }
        .dark .find-highlight { background: #92400e; }
        .find-current { background: #f59e0b; border-radius: 2px; }
        .dark .find-current { background: #d97706; }
      `}</style>

      <Modal
        open={showMove}
        onClose={() => setShowMove(false)}
        title="Move to category"
      >
        <div className="flex flex-col gap-2">
          {allCategories?.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleMove(cat.id!)}
              className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                cat.id === entry?.categoryId
                  ? 'bg-teal-50 dark:bg-teal-900/20 ring-1 ring-teal-300 dark:ring-teal-700'
                  : 'bg-gray-50 dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700'
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cat.color + '30' }}
              >
                <FontAwesomeIcon icon={iconLookup(cat.icon)} className="w-4 h-4" style={{ color: cat.color }} />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
              {cat.id === entry?.categoryId && (
                <span className="ml-auto text-xs text-teal-500 dark:text-teal-400 font-medium">Current</span>
              )}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={showVersions} onClose={() => setShowVersions(false)} title="Version History">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {versions.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">No saved versions yet</p>
          )}
          {versions.map((v) => (
            <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                  {v.title || 'Untitled'}
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1 leading-relaxed">
                  {v.contentHtml ? stripHtml(v.contentHtml) : ''}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-gray-400">
                    {new Date(v.savedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await restoreVersion(entryId, v.id)
                    const updated = await db.entries.get(entryId)
                    if (updated) setEntry({ ...updated, contentHtml: updated.contentHtml })
                    getVersions(entryId).then(setVersions)
                  } catch { showToast('Failed to restore version', 'error') }
                }}
                className="px-3 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-lg active:bg-teal-100 dark:active:bg-teal-900/40 transition-all"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 mr-1" />
                Restore
              </button>
            </div>
          ))}
        </div>
      </Modal>

    </div>
  )
}
