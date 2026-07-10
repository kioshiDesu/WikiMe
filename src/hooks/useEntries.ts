import { useCallback } from 'react'
import { useEntriesList } from './useEntriesList'
import { useEntryMutations } from './useEntryMutations'
import { useVersions } from './useVersions'
import { rebuildAllSearchIndexes } from '../utils/searchIndex'
import { db } from '../db/db'

export function useEntries(categoryId?: number, pageSize = 50) {
  const list = useEntriesList(categoryId, pageSize)
  const mutations = useEntryMutations()
  const versions = useVersions()

  const addEntry = useCallback(async (data: Parameters<typeof mutations.addEntry>[0]) => {
    const id = await mutations.addEntry(data)
    await list.refresh()
    return id
  }, [mutations, list])

  const updateEntry = useCallback(async (id: number, data: Parameters<typeof mutations.updateEntry>[1]) => {
    await mutations.updateEntry(id, data)
    await list.refresh()
  }, [mutations, list])

  const trashEntry = useCallback(async (id: number, days?: number) => {
    await mutations.trashEntry(id, days)
    await list.refresh()
  }, [mutations, list])

  const restoreEntry = useCallback(async (id: number) => {
    await mutations.restoreEntry(id)
    await list.refresh()
  }, [mutations, list])

  const deleteEntry = useCallback(async (id: number) => {
    await mutations.deleteEntry(id)
    await list.refresh()
  }, [mutations, list])

  const cleanupTrash = useCallback(async () => {
    await mutations.cleanupTrash()
    await list.refresh()
  }, [mutations, list])

  const rebuildSearchIndexes = useCallback(async () => {
    await rebuildAllSearchIndexes(db)
    await list.refresh()
  }, [list])

  return {
    ...list,
    ...versions,
    addEntry,
    updateEntry,
    trashEntry,
    restoreEntry,
    deleteEntry,
    cleanupTrash,
    rebuildSearchIndexes,
  }
}

export { useEntriesList } from './useEntriesList'
export { useEntryMutations } from './useEntryMutations'
export { useVersions } from './useVersions'