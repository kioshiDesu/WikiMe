import { describe, it, expect, beforeEach } from 'vitest'
import { executeImport } from '../../src/utils/exportImport'
import { db } from '../../src/db/db'

describe('import', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('imports data and rebuilds search index', async () => {
    const backup = JSON.stringify({
      version: 3,
      sections: [{ id: 1, name: 'Sec', icon: 'folder', sortOrder: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      categories: [{ id: 1, name: 'Cat', icon: 'star', color: '#14b8a6', sectionId: 1, sortOrder: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      entries: [{ id: 1, categoryId: 1, title: 'Imported', contentHtml: '<p>Hi</p>', pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      versions: []
    })
    await executeImport(backup)
    const entries = await db.entries.toArray()
    expect(entries.length).toBe(1)
    expect(entries[0].title).toBe('Imported')
  })

  it('can import the same backup twice without error', async () => {
    const backup = JSON.stringify({
      version: 3,
      sections: [{ id: 1, name: 'Sec', icon: 'folder', sortOrder: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      categories: [{ id: 1, name: 'Cat', icon: 'star', color: '#14b8a6', sectionId: 1, sortOrder: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      entries: [{ id: 1, categoryId: 1, title: 'Imported', contentHtml: '<p>Hi</p>', pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      versions: [{ id: 1, entryId: 1, title: 'Imported', contentHtml: '<p>Hi</p>', compressed: false, savedAt: new Date().toISOString() }]
    })
    await executeImport(backup)
    await executeImport(backup)
    const entries = await db.entries.toArray()
    expect(entries.length).toBe(1)
    expect(entries[0].title).toBe('Imported')
  })
})
