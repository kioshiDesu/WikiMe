import { useState, useEffect, useCallback } from 'react'
import { db, type Section } from '../db/db'

export function useSections() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await db.sections.toArray()
      setSections(data)
    } catch (e) { console.error('Failed to load sections', e) }
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const addSection = useCallback(async (data: Omit<Section, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    const id = await db.sections.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    } as Section)
    await refresh()
    return id
  }, [refresh])

  const updateSection = useCallback(async (id: number, data: Partial<Section>) => {
    await db.sections.update(id, { ...data, updatedAt: new Date() })
    await refresh()
  }, [refresh])

  const deleteSection = useCallback(async (id: number) => {
    const catIds = (await db.categories.where('sectionId').equals(id).toArray()).map(c => c.id!)
    const entryIds: number[] = []
    for (const catId of catIds) {
      const ids = (await db.entries.where('categoryId').equals(catId).toArray()).map(e => e.id!)
      entryIds.push(...ids)
    }
    if (entryIds.length > 0) {
      await db.searchIndex.where('entryId').anyOf(entryIds).delete()
      await db.versions.where('entryId').anyOf(entryIds).delete()
    }
    await db.entries.where('categoryId').anyOf(catIds).delete()
    await db.categories.where('sectionId').equals(id).delete()
    await db.sections.delete(id)
    await refresh()
  }, [refresh])

  return { sections, loading, addSection, updateSection, deleteSection, refresh }
}
