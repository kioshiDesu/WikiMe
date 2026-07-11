import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDatabase, faCheck, faCalendar } from '@fortawesome/free-solid-svg-icons'
import { useHeader } from '../context/HeaderContext'
import { useEntries } from '../hooks/useEntries'
import { RichEditor } from '../components/RichEditor'
import { useToast } from '../context/ToastContext'
import { db } from '../db/db'
import { addRecentEntry } from '../utils/recent'
import type { Entry, Category } from '../types'

export function EntryEditPage() {
  const { id, categoryId } = useParams<{ id?: string; categoryId?: string }>()
  const isEditing = !!id
  const entryId = isEditing ? Number(id) : undefined
  const catId = isEditing ? undefined : categoryId ? Number(categoryId) : undefined

  const [existingEntry, setExistingEntry] = useState<Entry | null>(null)
  const [existingCategory, setExistingCategory] = useState<Category | null>(null)
  const { showToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (!entryId && !catId) {
      showToast('Please select a category first', 'error')
      navigate('/', { replace: true })
      return
    }
  }, [entryId, catId, showToast, navigate])

  useEffect(() => {
    if (!entryId) return
    db.entries.get(entryId).then(data => {
      if (!data) {
        showToast('This entry no longer exists', 'error')
        navigate('/', { replace: true })
        return
      }
      setExistingEntry({ ...data, contentHtml: data.contentHtml })
    })
  }, [entryId])

  useEffect(() => {
    const id = catId || existingEntry?.categoryId
    if (!id) return
    db.categories.get(id).then(data => {
      if (!data && catId) {
        showToast('This category no longer exists', 'error')
        navigate('/', { replace: true })
        return
      }
      setExistingCategory(data || null)
    })
  }, [catId, existingEntry?.categoryId])

  const { addEntry, updateEntry } = useEntries()
  const { setConfig } = useHeader()
  const titleRef = useRef<HTMLInputElement>(null)

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [ready, setReady] = useState(isEditing ? false : true)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | 'idle'>('idle')

  const autoSaveIdRef = useRef<number | undefined>(entryId)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSavingRef = useRef(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doAutoSave = useCallback(async (t: string, c: string) => {
    if (autoSavingRef.current) return
    const hasContent = t.trim() || c.replace(/<[^>]*>/g, '').trim()
    if (!hasContent) return
    autoSavingRef.current = true
    setAutoSaveStatus('saving')
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    try {
      if (autoSaveIdRef.current !== undefined) {
        await updateEntry(autoSaveIdRef.current, { title: t.trim(), contentHtml: c })
        addRecentEntry({ id: autoSaveIdRef.current, title: t.trim(), categoryId: existingEntryRef.current?.categoryId || 0 })
      } else if (catId) {
        const newId = await addEntry({ categoryId: catId, title: t.trim(), contentHtml: c, pinned: false })
        autoSaveIdRef.current = newId
        addRecentEntry({ id: newId, title: t.trim(), categoryId: catId })
        window.history.replaceState(null, '', `#/entry/${newId}/edit`)
        const entry = await db.entries.get(newId)
        if (entry) setExistingEntry(entry)
      }
      setAutoSaveStatus('saved')
      hideTimerRef.current = setTimeout(() => setAutoSaveStatus('idle'), 2000)
    } catch {
      setAutoSaveStatus('idle')
    } finally {
      autoSavingRef.current = false
    }
  }, [catId, addEntry, updateEntry])

  const doAutoSaveRef = useRef(doAutoSave)
  doAutoSaveRef.current = doAutoSave
  const existingEntryRef = useRef(existingEntry)
  existingEntryRef.current = existingEntry

  useEffect(() => {
    if (!ready) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      doAutoSaveRef.current(title, content)
    }, 300)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [title, content, ready])

  useEffect(() => {
    if (isEditing) {
      if (!existingEntry) return
      setTitle(existingEntry.title)
      setContent(existingEntry.contentHtml)
      setReady(true)
    } else {
      setReady(true)
    }
  }, [existingEntry, isEditing])

  useLayoutEffect(() => {
    if (!ready || isEditing) return
    titleRef.current?.focus()
  }, [ready, isEditing])

  useEffect(() => {
    if (!ready || isEditing) return
    const t = setTimeout(() => titleRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [ready, isEditing])

  useEffect(() => {
    setConfig({
      title: isEditing ? 'Edit Entry' : 'New Entry',
      showBack: true,
      rightAction: (
        <div className="flex items-center gap-1.5 px-1">
          <FontAwesomeIcon
            icon={autoSaveStatus === 'saved' ? faCheck : faDatabase}
            className={`w-3.5 h-3.5 ${
              autoSaveStatus === 'saving' ? 'text-teal-500' :
              autoSaveStatus === 'saved' ? 'text-green-500' :
              'text-gray-300 dark:text-gray-600'
            }`}
          />
          <span className={`text-[11px] font-medium ${
            autoSaveStatus === 'saving' ? 'text-teal-500' :
            autoSaveStatus === 'saved' ? 'text-green-500' :
            'text-gray-300 dark:text-gray-600'
          }`}>
            {autoSaveStatus === 'saving' ? 'Saving' :
             autoSaveStatus === 'saved' ? 'Saved' :
             'Auto'}
          </span>
        </div>
      ),
    })
  }, [setConfig, isEditing, entryId, catId, navigate, autoSaveStatus])

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Entry title"
          className="flex-1 px-0 py-0.5 text-xl font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 bg-transparent border-none outline-none"
        />
      </div>
      <div data-testid="info-bar" className="min-h-[44px] px-4 py-2.5 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 flex-wrap border-b border-gray-100 dark:border-gray-800">
        {existingCategory && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: existingCategory.color }} />
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {existingCategory.name}
            </span>
          </span>
        )}
        {existingEntry && (
          <span className="flex items-center gap-1">
            <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" />
            {formatDate(new Date(existingEntry.updatedAt))}
          </span>
        )}
      </div>
      {ready && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="pt-3 flex-1 flex flex-col">
            <RichEditor content={content} onChange={setContent} />
          </div>
        </div>
      )}
    </div>
  )
}
