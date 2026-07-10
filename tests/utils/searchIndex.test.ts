import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rebuildAllSearchIndexes, buildSearchIndex, searchEntries } from '../../src/utils/searchIndex'
import { db } from '../../src/db/db'

describe('searchIndex rebuildAllSearchIndexes', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('rebuilds index when entries exist but index is empty', async () => {
    await db.entries.add({ categoryId: 1, title: 'Test', contentHtml: '<p>Hello world</p>', pinned: false, createdAt: new Date(), updatedAt: new Date() })
    await rebuildAllSearchIndexes(db)
    const results = await searchEntries(db, 'hello')
    expect(results).toContainEqual(expect.any(Number))
  })

  it('rebuilds index when index has MORE tokens than entries (orphaned tokens)', async () => {
    await db.entries.add({ categoryId: 1, title: 'Test', contentHtml: '<p>Hello</p>', pinned: false, createdAt: new Date(), updatedAt: new Date() })
    await buildSearchIndex(1, 'Test', '<p>Hello</p>', db)
    await db.entries.clear() // Entries deleted but index remains
    await db.entries.add({ categoryId: 1, title: 'New', contentHtml: '<p>World</p>', pinned: false, createdAt: new Date(), updatedAt: new Date() })
    // indexCount (1) >= entryCount (1) but index is stale
    await rebuildAllSearchIndexes(db)
    const results = await searchEntries(db, 'world')
    expect(results.length).toBeGreaterThan(0)
  })
})