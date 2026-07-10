import type { WikiMeDB } from '../db/db'

export function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? ''
}

export function tokenize(text: string): string[] {
  const tokens = text.toLowerCase().split(/[\s,.;:!?()\[\]{}"'/\\@#$%^&*+=<>~`|]+/)
  return [...new Set(tokens)].filter(t => t.length > 0)
}

export async function buildSearchIndex(
  entryId: number,
  title: string,
  contentHtml: string,
  db: WikiMeDB,
): Promise<void> {
  const text = title + ' ' + stripHtml(contentHtml)
  const tokens = tokenize(text)
  await db.searchIndex.where('entryId').equals(entryId).delete()
  if (tokens.length > 0) {
    await db.searchIndex.bulkAdd(tokens.map(token => ({ entryId, token })))
  }
}

export async function rebuildAllSearchIndexes(db: WikiMeDB): Promise<void> {
  const currentEntryIds = (await db.entries.toArray()).map(e => e.id!)
  const indexedEntryIds = [...new Set((await db.searchIndex.toArray()).map(r => r.entryId))]
  const missingCount = currentEntryIds.filter(id => !indexedEntryIds.includes(id)).length
  if (missingCount === 0 && indexedEntryIds.length > 0) return
  await db.searchIndex.clear()
  const allEntries = await db.entries.toArray()
  for (let i = 0; i < allEntries.length; i += 100) {
    const chunk = allEntries.slice(i, i + 100)
    const data: { entryId: number; token: string }[] = []
    for (const entry of chunk) {
      const content = entry.contentHtml || ''
      const text = entry.title + ' ' + stripHtml(content)
      const tokens = tokenize(text)
      for (const token of tokens) {
        data.push({ entryId: entry.id, token })
      }
    }
    if (data.length > 0) {
      await db.searchIndex.bulkAdd(data)
    }
  }
}

let _rebuildingIndex = false
export function isRebuildingIndex(): boolean { return _rebuildingIndex }
export function setRebuildingIndex(v: boolean): void { _rebuildingIndex = v }

export async function searchEntries(
  db: WikiMeDB,
  query: string,
): Promise<number[]> {
  const q = query.toLowerCase().trim()
  if (!q) return []

  if (!_rebuildingIndex) {
    const [indexCount, entryCount] = await Promise.all([
      db.searchIndex.count(),
      db.entries.count(),
    ])
    if (indexCount === 0 && entryCount > 0) {
      _rebuildingIndex = true
      try {
        await rebuildAllSearchIndexes(db)
      } catch (err) {
        console.error('Auto-rebuild failed:', err)
      } finally {
        _rebuildingIndex = false
      }
    }
  }

  const results = await db.searchIndex
    .where('token')
    .startsWith(q)
    .distinct()
    .toArray()
  return [...new Set(results.map(r => r.entryId))]
}
