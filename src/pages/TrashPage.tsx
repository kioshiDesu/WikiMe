import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faRotateLeft, faXmark, faClock, faTriangleExclamation, faRotate } from '@fortawesome/free-solid-svg-icons'
import { useHeader } from '../context/HeaderContext'
import { useTrashedEntries } from '../hooks/useTrashedEntries'
import { Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { ContentSkeleton } from '../components/SkeletonLoader'
import { VirtualList } from '../components/VirtualList'
import { useToast } from '../context/ToastContext'
import { db, type Entry, DEFAULT_TRASH_DAYS } from '../db/db'

export function TrashPage() {
  const { trashedEntries, restoreEntry, deleteEntry, loading, error, refresh } = useTrashedEntries()
  const { setConfig } = useHeader()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showPermanentDelete, setShowPermanentDelete] = useState(false)
  const [showAutoDelete, setShowAutoDelete] = useState(false)
  const [autoDeleteDays, setAutoDeleteDays] = useState(7)

  useEffect(() => {
    setConfig({
      title: 'Trash', showBack: true,
      rightAction: trashedEntries.length > 0 ? (
        <button
          onClick={() => setShowAutoDelete(true)}
          className="min-w-10 min-h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-all"
          title="Auto-delete settings"
        >
          <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
        </button>
      ) : undefined,
    })
  }, [setConfig, trashedEntries.length])

  const daysLeft = (e: Entry) => {
    if (!e.deletedAt) return 0
    const elapsed = Date.now() - new Date(e.deletedAt).getTime()
    const total = (e.trashDays || 7) * 86400000
    const remaining = Math.max(0, Math.ceil((total - elapsed) / 86400000))
    return remaining
  }

  const handleRestore = async (id: number) => {
    await restoreEntry(id)
    showToast('Entry restored', 'success')
  }

  const handlePermanentDelete = async () => {
    for (const id of selected) {
      await deleteEntry(id)
    }
    setSelected(new Set())
    setShowPermanentDelete(false)
    showToast('Permanently deleted', 'success')
  }

  const handleSetAutoDelete = async () => {
    await db.entries.toCollection().filter(e => e.deletedAt).modify({ trashDays: autoDeleteDays })
    await refresh()
    setShowAutoDelete(false)
    showToast(`Auto-delete set to ${autoDeleteDays} days for all trashed entries`, 'success')
  }

  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  if (loading) return <ContentSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <FontAwesomeIcon icon={faTriangleExclamation} className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Failed to load trash</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4 max-w-xs">{error.message}</p>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-xl active:bg-teal-100 dark:active:bg-teal-900/40 transition-all"
        >
          <FontAwesomeIcon icon={faRotate} className="w-3 h-3" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {trashedEntries.length === 0 ? (
        <EmptyState
          icon={faTrash}
          title="Trash is empty"
          description="Nothing to clean up — trashed entries show up here before being auto-deleted."
        />
      ) : (
        <>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-950/20">
              <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{selected.size} selected</span>
              <button onClick={() => setShowPermanentDelete(true)} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-all">
                <FontAwesomeIcon icon={faXmark} className="w-3 h-3 mr-1" />
                Delete permanently
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
<VirtualList
  items={trashedEntries}
  estimatedItemHeight={80}
  renderItem={(e) => {
    const remaining = daysLeft(e)
    return (
      <div
        key={e.id}
        onClick={() => toggle(e.id!)}
        className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-800 transition-all cursor-pointer ${selected.has(e.id!) ? 'bg-teal-50/50 dark:bg-teal-900/10' : ''}`}
      >
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      selected.has(e.id!)
                        ? 'border-teal-500 bg-teal-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selected.has(e.id!) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {e.title || 'Untitled'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <FontAwesomeIcon icon={faClock} className="w-3 h-3 text-gray-400" />
                        <span className={`text-xs ${remaining <= 1 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          {remaining} {remaining === 1 ? 'day' : 'days'} left
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Auto-deletes after {(e.trashDays || 7)} days
                      </div>
                    </div>
                    <button
                      onClick={ev => { ev.stopPropagation(); handleRestore(e.id!) }}
                      className="px-3 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-lg active:bg-teal-100 dark:active:bg-teal-900/40 transition-all flex-shrink-0"
                    >
                      <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3 mr-1" />
                      Restore
                    </button>
                  </div>
                )
              }}
            />
          </div>
        </>
      )}

      <Modal open={showAutoDelete} onClose={() => setShowAutoDelete(false)} title="Auto-delete Settings">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Set how many days trashed entries are kept before being permanently deleted. Applies to all current trashed entries.
        </p>
        <div className="flex items-center gap-2 mb-5">
          {[1, 3, 7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setAutoDeleteDays(d)}
              className={`flex-1 py-2 text-sm rounded-lg border transition-all ${
                autoDeleteDays === d
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 font-medium'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
              }`}
            >{d} day{d > 1 ? 's' : ''}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAutoDelete(false)} className="flex-1 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 transition-all">
            Cancel
          </button>
          <button onClick={handleSetAutoDelete} className="flex-1 py-2 text-sm rounded-lg bg-teal-500 text-white active:opacity-80 transition-all">
            Apply to all
          </button>
        </div>
      </Modal>

      <Modal open={showPermanentDelete} onClose={() => setShowPermanentDelete(false)} title="Delete permanently?">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {selected.size} {selected.size === 1 ? 'entry' : 'entries'} will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setShowPermanentDelete(false)} className="flex-1 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 transition-all">
            Cancel
          </button>
          <button onClick={handlePermanentDelete} className="flex-1 py-2 text-sm rounded-lg bg-red-500 text-white active:opacity-80 transition-all">
            Delete permanently
          </button>
        </div>
      </Modal>
    </div>
  )
}
