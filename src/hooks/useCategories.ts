import { useState, useEffect, useCallback } from 'react'
import { db, type Category } from '../db/db'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await db.categories.toArray()
      setCategories(data)
    } catch (e) { console.error('Failed to load categories', e) }
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const addCategory = useCallback(async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    const id = await db.categories.add({ ...data, createdAt: now, updatedAt: now } as Category)
    setCategories(prev => [...prev, { ...data, id: id as number, createdAt: now, updatedAt: now } as Category])
    return id
  }, [])

  const updateCategory = useCallback(async (id: number, data: Partial<Category>) => {
    const previousCategories = categories
    try {
      await db.categories.update(id, { ...data, updatedAt: new Date() })
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date() } as Category : c))
    } catch (error) {
      setCategories(previousCategories)
      throw error
    }
  }, [])

  const deleteCategory = useCallback(async (id: number) => {
    const entryIds = (await db.entries.where('categoryId').equals(id).toArray()).map(e => e.id!)
    if (entryIds.length > 0) {
      await db.searchIndex.where('entryId').anyOf(entryIds).delete()
      await db.versions.where('entryId').anyOf(entryIds).delete()
    }
    await db.categories.delete(id)
    await db.entries.where('categoryId').equals(id).delete()
    setCategories(prev => prev.filter(c => c.id !== id))
  }, [])

  return { categories, loading, addCategory, updateCategory, deleteCategory, refresh }
}
