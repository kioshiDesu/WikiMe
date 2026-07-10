# Task 1: Add searchIndex table to DB schema

**Files:**
- Modify: `src/db/db.ts`

**What to do:**
1. Add a `SearchIndexEntry` interface with fields: `id?: number`, `entryId: number`, `token: string`
2. Add `searchIndex` table to the `WikiMeDB` class with type `Table<SearchIndexEntry, number>`
3. Increment DB version from 4 to 5
4. Add `searchIndex: '++id, entryId, token'` to the stores schema
5. Keep the existing version 4 upgrade logic intact
6. Export `SearchIndexEntry` from the module

**Current db.ts:**
```ts
import Dexie, { type Table } from 'dexie'

export interface Section { ... }
export interface Category { ... }
export interface Entry { ... }
export interface EntryVersion { ... }

export const DEFAULT_TRASH_DAYS = 7
export const MAX_VERSIONS = 5

export class WikiMeDB extends Dexie {
  sections!: Table<Section, number>
  categories!: Table<Category, number>
  entries!: Table<Entry, number>
  versions!: Table<EntryVersion, number>

  constructor() {
    super('WikiMeDB')
    this.version(4).stores({
      sections: '++id, name',
      categories: '++id, name, sectionId',
      entries: '++id, categoryId, title, pinned, updatedAt, deletedAt',
      versions: '++id, entryId, savedAt',
    }).upgrade(async tx => {
      await tx.table('entries').toCollection().modify(e => {
        if (e.deletedAt === undefined) e.deletedAt = null
        if (e.trashDays === undefined) e.trashDays = DEFAULT_TRASH_DAYS
      })
    })
  }
}

export const db = new WikiMeDB()
```

**Verification:**
- Run `npm run build 2>&1 | tail -5`
- Expected: compiled with only the 3 standard bundle size warnings, no errors
