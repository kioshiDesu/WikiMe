import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faPencil, faFileLines, faSort, faCheckSquare, faThumbtack, faCheck, faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { useHeader } from '../context/HeaderContext'
import { useCategories } from '../hooks/useCategories'
import { useSections } from '../hooks/useSections'
import { useEntries } from '../hooks/useEntries'
import { useToast } from '../context/ToastContext'
import { EntryCard } from '../components/EntryCard'
import { SearchBar } from '../components/SearchBar'
import { VirtualList } from '../components/VirtualList'
import { EmptyState } from '../components/EmptyState'
import { Modal, ConfirmModal } from '../components/Modal'
import { FAB } from '../components/FAB'

import { db } from '../db/db'
import { iconLookup } from '../utils/icons'
import type { Category } from '../types'

export function CategoryPage() {
  const { id } = useParams<{ id: string }>()
  const catId = Number(id)
  const { updateCategory, deleteCategory } = useCategories()
  const { sections } = useSections()
  const { entries, refresh } = useEntries(catId)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { setConfig } = useHeader()

  const [category, setCategory] = useState<Category | null>(null)

  useEffect(() => {
    db.categories.get(catId).then(data => {
      if (data) setCategory(data)
      else {
        showToast('This category no longer exists', 'error')
        navigate('/', { replace: true })
      }
    })
  }, [catId])

  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<'updated' | 'title-asc' | 'title-desc' | 'created'>('updated')
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSection, setEditSection] = useState<number | undefined>(undefined)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [showBulkMove, setShowBulkMove] = useState(false)

  const [allCategories, setAllCategories] = useState<Category[]>([])

  useEffect(() => {
    db.categories.toArray().then(setAllCategories)
  }, [])

  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  const sortedEntries = useMemo(() => {
    const list = [...entries]
    switch (sortMode) {
      case 'title-asc': return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      case 'title-desc': return list.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
      case 'created': return list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      default: return list
    }
  }, [entries, sortMode])

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return sortedEntries
    return sortedEntries.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.contentHtml || '').toLowerCase().includes(q)
    )
  }, [debouncedQuery, sortedEntries])

  useEffect(() => {
    if (!category) return
    setConfig({
      title: category.name,
      showBack: true,
      onBack: () => navigate('/'),
      rightAction: (
        <div className="flex gap-1">
          {entries.length > 0 && (
            <button
              onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelected(new Set()) }}
              className={`min-w-10 min-h-10 flex items-center justify-center rounded-xl transition-all ${
                selectMode ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20' : 'text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
              }`}
            >
              <FontAwesomeIcon icon={faCheckSquare} className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (!category) return
              setEditName(category.name)
              setEditSection(category.sectionId || sections[0]?.id)
              setShowEdit(true)
            }}
            className="min-w-10 min-h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-all"
          >
            <FontAwesomeIcon icon={faPencil} className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="min-w-10 min-h-10 flex items-center justify-center rounded-xl text-red-500 active:bg-red-50 dark:active:bg-red-950 transition-all"
          >
            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
          </button>
        </div>
      ),
    })
  }, [setConfig, category, catId, entries.length, selectMode])

  const handleDelete = async () => {
    await deleteCategory(catId)
    showToast('Category deleted', 'success')
    navigate('/')
  }

  const handleEdit = async () => {
    if (!editName.trim()) return
    await updateCategory(catId, { name: editName.trim(), sectionId: editSection })
    showToast('Category updated', 'success')
    setShowEdit(false)
  }

  return (
    <div>
      {entries.length === 0 && !query.trim() ? (
        <EmptyState
          icon={faFileLines}
          title="No entries yet"
          description="Tap the + button below to write your first note."
        />
      ) : (
        <div>
          <SearchBar value={query} onChange={setQuery} placeholder="Search entries..." />
          {!query.trim() && entries.length > 0 && (
            <div className="flex items-center gap-2 px-4 pb-2">
              <FontAwesomeIcon icon={faSort} className="w-3 h-3 text-gray-400" />
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as any)}
                className="text-xs bg-transparent text-gray-500 dark:text-gray-400 outline-none"
              >
                <option value="updated">Recently updated</option>
                <option value="created">Oldest first</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
              </select>
            </div>
          )}
          {query.trim() && filtered.length === 0 ? (
            <EmptyState
              icon={faFileLines}
              title="No results"
              description={`Try a different search term — nothing matches "${query}"`}
            />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
<VirtualList
  items={query.trim() ? filtered : sortedEntries}
  estimatedItemHeight={116}
  renderItem={(entry) => (
    <div key={entry.id} className="flex items-start">
                    {selectMode && (
                      <button
                        onClick={() => {
                          const next = new Set(selected)
                          if (next.has(entry.id!)) next.delete(entry.id!)
                          else next.add(entry.id!)
                          setSelected(next)
                        }}
                        className={`flex-shrink-0 ml-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          selected.has(entry.id!)
                            ? 'bg-teal-500 border-teal-500 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {selected.has(entry.id!) && <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <EntryCard
                        entry={entry}
                        onClick={() => selectMode ? (() => {
                          const next = new Set(selected)
                          if (next.has(entry.id!)) next.delete(entry.id!)
                          else next.add(entry.id!)
                          setSelected(next)
                        })() : navigate(`/entry/${entry.id}`)}
                      />
                    </div>
                  </div>
                )}
              />
            </div>
          )}
        </div>
      )}

      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-6 bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">{selected.size} selected</span>
            <button
              onClick={async () => {
                await db.entries.where(':id').anyOf([...selected]).modify({ pinned: true, updatedAt: new Date() })
                showToast(`Pinned ${selected.size} entries`, 'success')
                setSelected(new Set())
                await refresh()
              }}
              className="ml-auto px-4 py-2 rounded-xl text-sm font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 active:bg-teal-100 dark:active:bg-teal-900/50 transition-all"
            >
              <FontAwesomeIcon icon={faThumbtack} className="w-3 h-3 mr-1.5 rotate-45" />
              Pin
            </button>
            <button
              onClick={() => setShowBulkMove(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-all"
            >
              <FontAwesomeIcon icon={faFolderOpen} className="w-3 h-3 mr-1.5" />
              Move
            </button>
            <button
              onClick={() => setShowBulkDelete(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-red-500 bg-red-50 dark:bg-red-950/30 active:bg-red-100 dark:active:bg-red-950/50 transition-all"
            >
              <FontAwesomeIcon icon={faTrash} className="w-3 h-3 mr-1.5" />
              Delete
            </button>
          </div>
        </div>
      )}

      {!(selectMode && selected.size > 0) && <FAB onClick={() => navigate(`/entry/new/${catId}`)} />}

      <ConfirmModal
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={async () => {
          const ids = [...selected]
          await db.entries.where(':id').anyOf(ids).delete()
          await db.versions.where('entryId').anyOf(ids).delete()
          showToast(`Deleted ${selected.size} entries`, 'success')
          setSelected(new Set())
          setSelectMode(false)
          await refresh()
        }}
        title="Delete entries"
        message={`Delete ${selected.size} selected entries? This cannot be undone.`}
      />

      <Modal
        open={showBulkMove}
        onClose={() => setShowBulkMove(false)}
        title="Move to category"
      >
        <div className="flex flex-col gap-2">
          {allCategories.filter(c => c.id !== catId).map(cat => (
            <button
              key={cat.id}
              onClick={async () => {
                await db.entries.where(':id').anyOf([...selected]).modify({ categoryId: cat.id!, updatedAt: new Date() })
                showToast(`Moved ${selected.size} entries to ${cat.name}`, 'success')
                setSelected(new Set())
                setSelectMode(false)
                setShowBulkMove(false)
                await refresh()
              }}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all bg-gray-50 dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cat.color + '30' }}
              >
                <FontAwesomeIcon icon={iconLookup(cat.icon)} className="w-4 h-4" style={{ color: cat.color }} />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
            </button>
          ))}
          {allCategories.filter(c => c.id !== catId).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No other categories</p>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Delete "${category?.name}" and all its entries? This cannot be undone.`}
      />

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Category"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setShowEdit(false)}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-teal-500 active:bg-teal-600 transition-all"
            >
              Save
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500/50"
            autoFocus
          />
          <select
            value={editSection ?? ''}
            onChange={e => setEditSection(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500/50 appearance-none"
          >
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  )
}
