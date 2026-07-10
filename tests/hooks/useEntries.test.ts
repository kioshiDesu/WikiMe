import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEntries } from '../../src/hooks/useEntries'
import { db } from '../../src/db/db'

describe('useEntries.saveVersion deduplication', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('does not create duplicate version when title and content unchanged', async () => {
    const { result } = renderHook(() => useEntries())
    const entryId = await result.current.addEntry({ categoryId: 1, title: 'Test', contentHtml: '<p>Hello</p>', pinned: false })
    await waitFor(() => expect(result.current.entries.length).toBe(1))

    // Simulate EntryViewPage loading and saving version
    await result.current.saveVersion(entryId, 'Test', '<p>Hello</p>')
    const versions1 = await result.current.getVersions(entryId)
    expect(versions1.length).toBe(1)

    // Call again with same content (e.g., user goes edit->view without changes)
    await result.current.saveVersion(entryId, 'Test', '<p>Hello</p>')
    const versions2 = await result.current.getVersions(entryId)
    expect(versions2.length).toBe(1) // Should NOT create duplicate
  })

  it('creates new version when title trimmed differs from stored', async () => {
    const { result } = renderHook(() => useEntries())
    const entryId = await result.current.addEntry({ categoryId: 1, title: '  Test  ', contentHtml: '<p>Hello</p>', pinned: false })
    await waitFor(() => expect(result.current.entries.length).toBe(1))

    await result.current.saveVersion(entryId, 'Test', '<p>Hello</p>')
    const versions = await result.current.getVersions(entryId)
    expect(versions.length).toBe(1) // Trailing spaces trimmed, same content
  })
})