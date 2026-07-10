import { describe, it, expect, beforeEach } from 'vitest'
import { analyzeImport, executeImport, exportData } from '../../src/utils/exportImport'
import { db } from '../../src/db/db'

describe('import atomicity', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('rolls back all changes if import fails mid-way', async () => {
    await db.categories.add({ name: 'Original', icon: 'star', color: '#fff', sortOrder: 0, createdAt: new Date(), updatedAt: new Date() })
    await db.entries.add({ categoryId: 1, title: 'Original Entry', contentHtml: '<p>Content</p>', pinned: false, createdAt: new Date(), updatedAt: new Date() })

    const badBackup = JSON.stringify({ categories: [], entries: [{}] })

    await expect(analyzeImport(badBackup)).rejects.toThrow()

    const cats = await db.categories.toArray()
    const entries = await db.entries.toArray()
    expect(cats.length).toBe(1)
    expect(entries.length).toBe(1)
  })

  it('succeeds with valid backup and rebuilds search index', async () => {
    const backup = JSON.stringify({
      sections: [{ name: 'Sec', icon: 'folder', sortOrder: 0, createdAt: new Date(), updatedAt: new Date() }],
      categories: [{ name: 'Cat', icon: 'star', color: '#14b8a6', sectionId: 1, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() }],
      entries: [{ categoryId: 1, title: 'Imported', contentHtml: '<p>Hi</p>', pinned: false, createdAt: new Date(), updatedAt: new Date() }],
      versions: []
    })
    await executeImport(backup, new Set())
    const entries = await db.entries.toArray()
    expect(entries.length).toBe(1)
    expect(entries[0].title).toBe('Imported')
  })
})
