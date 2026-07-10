import { db } from '../db/db'
import LZString from 'lz-string'

export interface EntryConflict {
  index: number
  title: string
  categoryName: string
  existingId: number
}

interface ImportData {
  version: number
  sections: any[]
  categories: any[]
  entries: any[]
  versions: any[]
}

function reviveDates(data: ImportData): void {
  const dateFields = ['createdAt', 'updatedAt', 'deletedAt', 'savedAt']
  for (const table of ['sections', 'categories', 'entries', 'versions'] as const) {
    if (data[table]) {
      for (const row of data[table]) {
        for (const field of dateFields) {
          if (row[field] != null) row[field] = new Date(row[field])
        }
      }
    }
  }
}

function parseImport(raw: string): ImportData {
  let json: string
  if (raw.trim().startsWith('{')) {
    json = raw
  } else {
    const d = LZString.decompressFromUTF16(raw)
    if (!d) throw new Error('Invalid compressed backup')
    json = d
  }
  const data = JSON.parse(json) as ImportData
  const version = data.version ?? 1
  if (version > 3) throw new Error(`Unsupported backup version ${version}`)
  if (!data.categories || !data.entries) {
    throw new Error('Invalid backup file')
  }
  reviveDates(data)
  for (const entry of data.entries) {
    if (!entry.title || !entry.contentHtml) {
      throw new Error('Entry missing required title or contentHtml')
    }
  }
  return data
}

export async function analyzeImport(raw: string): Promise<{
  conflicts: EntryConflict[]
  preview: { sections: number; categories: number; entries: number }
}> {
  const data = parseImport(raw)
  const existingSections = await db.sections.toArray()
  const existingCategories = await db.categories.toArray()
  const existingEntries = await db.entries.toArray()

  const oldToNewSection = new Map<number, number | 'new'>()
  for (const s of data.sections || []) {
    const match = existingSections.find(ex => ex.name === s.name)
    oldToNewSection.set(s.id, match ? match.id! : 'new')
  }

  const conflicts: EntryConflict[] = []
  const oldToNewCategory = new Map<number, number | 'new'>()

  for (const c of data.categories) {
    const targetSectionId = c.sectionId != null
      ? oldToNewSection.get(c.sectionId) ?? null
      : null
    const match = existingCategories.find(ex =>
      ex.name === c.name &&
      (targetSectionId == null ? ex.sectionId == null : ex.sectionId === targetSectionId)
    )
    oldToNewCategory.set(c.id, match ? match.id! : 'new')
  }

  for (let i = 0; i < data.entries.length; i++) {
    const e = data.entries[i]
    const catId = oldToNewCategory.get(e.categoryId)
    if (catId == null || catId === 'new') continue
    const existingEntry = existingEntries.find(ex =>
      ex.title === e.title && ex.categoryId === catId && !ex.deletedAt
    )
    if (existingEntry) {
      const cat = existingCategories.find(c => c.id === catId)
      conflicts.push({
        index: i,
        title: e.title,
        categoryName: cat?.name || 'Unknown',
        existingId: existingEntry.id!,
      })
    }
  }

  return {
    conflicts,
    preview: {
      sections: data.sections?.length || 0,
      categories: data.categories.length,
      entries: data.entries.length,
    },
  }
}

function nextAvailableTitle(base: string, categoryId: number, existingEntries: any[]): string {
  let counter = 1
  let title: string
  do {
    title = `${base} (${counter})`
    counter++
  } while (existingEntries.some(e => e.title === title && e.categoryId === categoryId))
  return title
}

export async function executeImport(
  raw: string,
  overwriteIndices: Set<number>,
): Promise<void> {
  const data = parseImport(raw)

  await db.transaction('rw', db.categories, db.entries, db.sections, db.versions, db.searchIndex, async () => {
    await db.searchIndex.clear()

    const existingSections = await db.sections.toArray()
    const existingCategories = await db.categories.toArray()
    let existingEntries = await db.entries.toArray()

    const oldToNewSection = new Map<number, number>()

    for (const s of data.sections || []) {
      const match = existingSections.find(ex => ex.name === s.name)
      if (match) {
        oldToNewSection.set(s.id, match.id!)
      } else {
        const now = new Date()
        const newId = await db.sections.add({
          name: s.name,
          icon: s.icon || 'folder',
          sortOrder: s.sortOrder || Date.now(),
          createdAt: s.createdAt || now,
          updatedAt: s.updatedAt || now,
        } as any)
        oldToNewSection.set(s.id, newId as number)
      }
    }

    const oldToNewCategory = new Map<number, number>()

    for (const c of data.categories) {
      const targetSectionId = c.sectionId != null
        ? (oldToNewSection.get(c.sectionId) ?? null)
        : null
      const match = existingCategories.find(ex =>
        ex.name === c.name &&
        (targetSectionId == null ? ex.sectionId == null : ex.sectionId === targetSectionId)
      )
      if (match) {
        oldToNewCategory.set(c.id, match.id!)
      } else {
        const now = new Date()
        const newId = await db.categories.add({
          name: c.name,
          icon: c.icon || 'star',
          color: c.color || '#14b8a6',
          sectionId: targetSectionId,
          sortOrder: c.sortOrder || Date.now(),
          createdAt: c.createdAt || now,
          updatedAt: c.updatedAt || now,
        } as any)
        oldToNewCategory.set(c.id, newId as number)
      }
    }

    const oldToNewEntry = new Map<number, number>()

    for (let i = 0; i < data.entries.length; i++) {
      const e = data.entries[i]
      const catId = oldToNewCategory.get(e.categoryId) ?? e.categoryId

      if (overwriteIndices.has(i)) {
        const existingEntry = existingEntries.find(ex =>
          ex.title === e.title && ex.categoryId === catId && !ex.deletedAt
        )
        if (existingEntry) {
          await db.entries.update(existingEntry.id!, {
            categoryId: catId,
            title: e.title,
            contentHtml: e.contentHtml,
            pinned: e.pinned ?? false,
            deletedAt: e.deletedAt ?? null,
            trashDays: e.trashDays ?? 7,
            compressed: e.compressed ?? false,
            updatedAt: e.updatedAt || new Date(),
          } as any)
          oldToNewEntry.set(e.id, existingEntry.id!)
        }
      } else {
        const title = nextAvailableTitle(e.title, catId, existingEntries)
        const now = new Date()
        const newId = await db.entries.add({
          categoryId: catId,
          title,
          contentHtml: e.contentHtml,
          pinned: e.pinned ?? false,
          deletedAt: e.deletedAt ?? null,
          trashDays: e.trashDays ?? 7,
          compressed: e.compressed ?? false,
          createdAt: e.createdAt || now,
          updatedAt: e.updatedAt || now,
        } as any)
        oldToNewEntry.set(e.id, newId as number)
      }
    }

    if (data.versions?.length) {
      const migrated = data.versions
        .filter((v: any) => oldToNewEntry.has(v.entryId))
        .map((v: any) => ({
          ...v,
          entryId: oldToNewEntry.get(v.entryId),
        }))
      if (migrated.length > 0) {
        await db.versions.bulkAdd(migrated)
      }
    }
  })

  const { rebuildAllSearchIndexes } = await import('../utils/searchIndex')
  await rebuildAllSearchIndexes(db)
}

export async function exportData() {
  const data = {
    version: 3,
    categories: await db.categories.toArray(),
    entries: await db.entries.toArray(),
    sections: await db.sections.toArray(),
    versions: await db.versions.toArray(),
  }
  const json = JSON.stringify(data)
  const compressed = LZString.compressToUTF16(json)
  const filename = `wikime-backup-${new Date().toISOString().split('T')[0]}.json`
  const blob = new Blob([compressed], { type: 'application/json' })

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ files: [new File([blob], filename, { type: 'application/json' })], title: filename })
      return
    } catch { /* user cancelled or share not supported */ }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}
