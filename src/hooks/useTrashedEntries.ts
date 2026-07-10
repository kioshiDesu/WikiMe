import { useState, useEffect, useCallback } from 'react'
import { db, type Entry, DEFAULT_TRASH_DAYS } from '../db/db'

export function useTrashedEntries() {
  const [trashedEntries, setTrashedEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadTrashed = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!db.isOpen()) await db.open()
      const data = (await db.entries.toArray()).filter(e => e.deletedAt)
      const sorted = data.sort((a, b) => {
        const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
        const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
        return bTime - aTime
      })
      setTrashedEntries(sorted)
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e ?? 'Unknown error'))
      console.error('Failed to load trashed entries', err)
      setError(err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadTrashed() }, [loadTrashed])

  const refresh = useCallback(() => { loadTrashed() }, [loadTrashed])

  const restoreEntry = useCallback(async (id: number) => {
    const now = new Date()
    await db.entries.update(id, { deletedAt: null, updatedAt: now })
    setTrashedEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const deleteEntry = useCallback(async (id: number) => {
    await db.searchIndex.where('entryId').equals(id).delete()
    await db.versions.where('entryId').equals(id).delete()
    await db.entries.delete(id)
    setTrashedEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  return { trashedEntries, loading, error, restoreEntry, deleteEntry, refresh }
}