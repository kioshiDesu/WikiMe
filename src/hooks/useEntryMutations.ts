import { useCallback, useRef, useEffect } from 'react'
import { db, type Entry, DEFAULT_TRASH_DAYS } from '../db/db'
import { buildSearchIndex } from '../utils/searchIndex'

const DEBOUNCE_MS = 500

const flushRebuild = async (pending: typeof pendingRebuildRef) => {
  const pr = pending.current
  if (pr) {
    pending.current = null
    try {
      await buildSearchIndex(pr.entryId, pr.title, pr.contentHtml, db)
    } catch (e) {
      console.error('Search index rebuild failed:', e)
    }
  }
}

export function useEntryMutations() {
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const pendingRebuildRef = useRef<{ entryId: number; title: string; contentHtml: string } | null>(null)

  useEffect(() => {
    return () => {
      if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current)
      flushRebuild(pendingRebuildRef)
    }
  }, [])

  const addEntry = useCallback(async (data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'trashDays' | 'compressed'>) => {
    const now = new Date()
    const rawContent = data.contentHtml || ''
    const id = await db.entries.add({
      ...data,
      contentHtml: rawContent,
      compressed: true,
      deletedAt: null,
      trashDays: DEFAULT_TRASH_DAYS,
      createdAt: now,
      updatedAt: now,
    } as Entry)
    await buildSearchIndex(id as number, data.title || '', rawContent, db)
    return id
  }, [])

  const scheduleRebuild = useCallback((entryId: number, title: string, contentHtml: string) => {
    pendingRebuildRef.current = { entryId, title, contentHtml }
    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current)
    rebuildTimerRef.current = setTimeout(async () => {
      await flushRebuild(pendingRebuildRef)
    }, DEBOUNCE_MS)
  }, [])

  const updateEntry = useCallback(async (id: number, data: Partial<Entry>) => {
    const updateData: Partial<Entry> = { ...data, updatedAt: new Date() }
    let rawContent: string | undefined
    if (data.contentHtml !== undefined) {
      rawContent = data.contentHtml
      updateData.contentHtml = rawContent
      updateData.compressed = true
    }
    await db.entries.update(id, updateData)
    if (data.title !== undefined || rawContent !== undefined) {
      const entry = await db.entries.get(id)
      if (entry) {
        const content = rawContent ?? entry.contentHtml
        scheduleRebuild(id, entry.title, content)
      }
    }
  }, [scheduleRebuild])

  const trashEntry = useCallback(async (id: number, days?: number) => {
    const now = new Date()
    await db.entries.update(id, { deletedAt: now, trashDays: days ?? DEFAULT_TRASH_DAYS, updatedAt: now })
  }, [])

  const restoreEntry = useCallback(async (id: number) => {
    const now = new Date()
    await db.entries.update(id, { deletedAt: null, updatedAt: now })
  }, [])

  const deleteEntry = useCallback(async (id: number) => {
    await db.searchIndex.where('entryId').equals(id).delete()
    await db.versions.where('entryId').equals(id).delete()
    await db.entries.delete(id)
  }, [])

  const cleanupTrash = useCallback(async () => {
    const now = Date.now()
    const expired = (await db.entries.toArray()).filter(e => {
      if (!e.deletedAt) return false
      const deadline = new Date(e.deletedAt).getTime() + (e.trashDays || DEFAULT_TRASH_DAYS) * 86400000
      return now >= deadline
    })
    for (const e of expired) {
      await db.searchIndex.where('entryId').equals(e.id!).delete()
      await db.entries.delete(e.id!)
      await db.versions.where('entryId').equals(e.id!).delete()
    }
  }, [])

  return { addEntry, updateEntry, trashEntry, restoreEntry, deleteEntry, cleanupTrash }
}