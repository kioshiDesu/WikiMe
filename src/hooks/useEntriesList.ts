import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { db, type Entry } from '../db/db'

export function useEntriesList(categoryId?: number, pageSize = 50) {
  const [allEntries, setAllEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const offsetRef = useRef(0)

  const loadPage = useCallback(async (reset = false) => {
    setLoading(true)
    setError(null)
    try {
      // Ensure db is ready
      if (!db.isOpen()) {
        await db.open()
      }
      if (!db.entries) {
        throw new Error('Database entries table not initialized')
      }

      const start = reset ? 0 : offsetRef.current
      let data: Entry[]
      if (categoryId !== undefined && !Number.isNaN(categoryId)) {
        try {
          data = await db.entries
            .where('[categoryId+updatedAt]')
            .between([categoryId, new Date(0)], [categoryId, new Date(8640000000000000)])
            .reverse()
            .offset(start)
            .limit(pageSize)
            .toArray()
        } catch {
          const all = await db.entries.where('categoryId').equals(categoryId).toArray()
          const sorted = all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          data = sorted.slice(start, start + pageSize)
        }
      } else {
        // For all entries, use orderBy with reverse (works on primary index)
        data = await db.entries.orderBy('updatedAt').reverse().offset(start).limit(pageSize).toArray()
      }
      if (reset) setAllEntries(data)
      else setAllEntries(prev => [...prev, ...data])
      setHasMore(data.length === pageSize)
      offsetRef.current = start + data.length
    } catch (e) {
      console.error('Failed to load entries - raw error:', e, 'type:', typeof e, 'constructor:', e?.constructor?.name)
      const err = e instanceof Error ? e : new Error(String(e ?? 'Unknown error'))
      console.error('Failed to load entries', err, { message: err.message, stack: err.stack, name: err.name, cause: err.cause })
      setError(err)
    }
    setLoading(false)
  }, [categoryId, pageSize])

  // Ensure db is open before loading
  useEffect(() => {
    if (!db.isOpen()) {
      db.open().catch(err => {
        console.error('Failed to open database:', err)
        setError(err instanceof Error ? err : new Error(String(err)))
      })
    }
  }, [])

  const refresh = useCallback(() => {
    offsetRef.current = 0
    setHasMore(true)
    loadPage(true)
  }, [loadPage])

  useEffect(() => {
    loadPage(true)
  }, [loadPage])

  const loadMore = useCallback(() => {
    if (hasMore && !loading) loadPage(false)
  }, [hasMore, loading, loadPage])

  const entries = useMemo(() =>
    allEntries
      .filter(e => !e.deletedAt)
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }),
    [allEntries]
  )

  const trashedEntries = useMemo(() =>
    [...allEntries]
      .filter(e => e.deletedAt)
      .sort((a, b) => (b.deletedAt?.getTime() || 0) - (a.deletedAt?.getTime() || 0)),
    [allEntries]
  )

  return { entries, trashedEntries, loading, hasMore, loadMore, refresh, error }
}