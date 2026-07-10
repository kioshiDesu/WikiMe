# Task 11: Include versions in export/import

**Files:**
- Modify: `src/utils/exportImport.ts`

**What to do:**

Add version history to the export/import flow so users don't lose version history when backing up and restoring.

## Export (exportData)

Add `versions` to the export data:
```ts
export async function exportData() {
  const data = {
    categories: await db.categories.toArray(),
    entries: await db.entries.toArray(),
    sections: await db.sections.toArray(),
    versions: await db.versions.toArray(),
  }
  // ... rest stays the same
}
```

## Import (importData)

1. Add `versions` to the transaction:
```ts
await db.transaction('rw', db.categories, db.entries, db.sections, db.versions, async () => {
```

2. Add an `oldToNewEntry` map to track entry ID remapping:
After the entry import, build the map:
```ts
const allNewEntries = await db.entries.toArray()
const oldToNewEntry = new Map<number, number>()
if (data.entries?.length) {
  const oldEntries: any[] = data.entries
  oldEntries.forEach((e: any, i: number) => {
    // We can't get new IDs from bulkAdd without allKeys,
    // so get the auto-generated IDs by ordering
  })
}
```

Wait — `db.entries.bulkAdd()` doesn't return the new IDs when called without `{ allKeys: true }`. To get the mapping, I need a different approach.

**Simpler approach:** After importing entries, fetch all entries and build the mapping by matching on title + createdAt (since createdAt is unique enough):
```ts
const oldToNewEntry = new Map<number, number>()
if (data.entries?.length) {
  const existing = await db.entries.toArray()
  data.entries.forEach((oldEntry: any) => {
    const match = existing.find(
      (e: any) => e.title === oldEntry.title && e.createdAt?.getTime() === new Date(oldEntry.createdAt).getTime()
    )
    if (match) oldToNewEntry.set(oldEntry.id, match.id!)
  })
}
```

3. Import versions with remapped entryId:
```ts
if (data.versions?.length) {
  const migrated = data.versions.map((v: any) => ({
    ...v,
    entryId: oldToNewEntry.get(v.entryId) ?? v.entryId,
  }))
  await db.versions.bulkAdd(migrated)
}
```

4. Rebuild search index after import:
After the transaction, add:
```ts
const { rebuildAllSearchIndexes } = await import('../utils/searchIndex')
await rebuildAllSearchIndexes(db)
```

## Actual changes to make

Read the current file and modify it. Here's the complete updated file:

```ts
import { db } from '../db/db'

export async function exportData() {
  const data = {
    categories: await db.categories.toArray(),
    entries: await db.entries.toArray(),
    sections: await db.sections.toArray(),
    versions: await db.versions.toArray(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wikime-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importData(json: string) {
  const data = JSON.parse(json)
  if (!data.categories || !data.entries) {
    throw new Error('Invalid backup file')
  }

  await db.transaction('rw', db.categories, db.entries, db.sections, db.versions, db.searchIndex, async () => {
    await db.categories.clear()
    await db.entries.clear()
    await db.sections.clear()
    await db.versions.clear()
    await db.searchIndex.clear()

    const oldToNewSection = new Map<number, number>()
    if (data.sections?.length) {
      const newIds = await db.sections.bulkAdd(data.sections, { allKeys: true })
      data.sections.forEach((s: any, i: number) => {
        oldToNewSection.set(s.id, newIds[i] as number)
      })
    }

    const oldToNewCategory = new Map<number, number>()
    if (data.categories?.length) {
      const migrated = data.categories.map((c: any) => ({
        ...c,
        sectionId: c.sectionId != null ? (oldToNewSection.get(c.sectionId) ?? null) : null,
      }))
      const newIds = await db.categories.bulkAdd(migrated, { allKeys: true })
      data.categories.forEach((c: any, i: number) => {
        oldToNewCategory.set(c.id, newIds[i] as number)
      })
    }

    const oldToNewEntry = new Map<number, number>()
    if (data.entries?.length) {
      const migrated = data.entries.map((e: any) => ({
        ...e,
        categoryId: oldToNewCategory.get(e.categoryId) ?? e.categoryId,
      }))
      const newEntryIds = await db.entries.bulkAdd(migrated, { allKeys: true })
      data.entries.forEach((oldEntry: any, i: number) => {
        oldToNewEntry.set(oldEntry.id, newEntryIds[i] as number)
      })
    }

    if (data.versions?.length) {
      const migrated = data.versions.map((v: any) => ({
        ...v,
        entryId: oldToNewEntry.get(v.entryId) ?? v.entryId,
      }))
      await db.versions.bulkAdd(migrated)
    }
  })

  const { rebuildAllSearchIndexes } = await import('../utils/searchIndex')
  await rebuildAllSearchIndexes(db)
}
```

**Verification:**
- Run `npm run build 2>&1 | tail -5`
- Expected: compiled successfully, no errors
