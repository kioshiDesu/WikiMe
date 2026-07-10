import { useCallback } from 'react'
import { db, type EntryVersion, MAX_VERSIONS } from '../db/db'
import { compressHtml, decompressHtml, tryDecompress } from '../utils/compress'

const VERSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

const normalizeHtml = (html: string): string => {
  const div = document.createElement('div')
  div.innerHTML = html.trim()
  return div.innerHTML
}
const norm = (s: string) => s.trim()
const normHtml = (s: string) => normalizeHtml(s)

export function useVersions() {
  const saveVersion = useCallback(async (entryId: number, title: string, contentHtml: string) => {
    const all = await db.versions.where('entryId').equals(entryId).sortBy('savedAt')
    if (all.length > 0) {
      const latest = all[all.length - 1]
      const latestContent = tryDecompress(latest.contentHtml, latest.compressed)
      if (normHtml(latestContent) === normHtml(contentHtml) && norm(latest.title) === norm(title)) return
    }
    await db.versions.add({
      entryId,
      title: norm(title),
      contentHtml: compressHtml(contentHtml),
      compressed: true,
      savedAt: new Date(),
    })
    const updated = await db.versions.where('entryId').equals(entryId).sortBy('savedAt')
    const cutoff = Date.now() - VERSION_MAX_AGE_MS
    const keep = updated.filter(v => v.savedAt.getTime() >= cutoff).slice(-MAX_VERSIONS)
    const toDeleteIds = updated.filter(v => !keep.includes(v)).map(v => v.id!)
    for (const id of toDeleteIds) await db.versions.delete(id!)
  }, [])

  const getVersions = useCallback(async (entryId: number): Promise<EntryVersion[]> => {
    const versions = await db.versions.where('entryId').equals(entryId).sortBy('savedAt')
    return versions.reverse()
  }, [])

  const restoreVersion = useCallback(async (entryId: number, versionId: number) => {
    const version = await db.versions.get(versionId)
    if (!version) return
    const current = await db.entries.get(entryId)
    if (!current) return
    if (current.contentHtml !== version.contentHtml || current.title !== version.title) {
      const rawContent = tryDecompress(current.contentHtml, current.compressed)
      await saveVersion(entryId, current.title, rawContent)
    }
    await db.entries.update(entryId, {
      title: version.title,
      contentHtml: version.contentHtml,
      updatedAt: new Date(),
    })
    await db.versions.delete(versionId)
  }, [saveVersion])

  return { saveVersion, getVersions, restoreVersion }
}