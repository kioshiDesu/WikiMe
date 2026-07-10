import Dexie, { type Table } from 'dexie'

export interface Section {
  id: number
  name: string
  icon: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: number
  name: string
  icon: string
  color: string
  sectionId: number | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Entry {
  id: number
  categoryId: number
  title: string
  contentHtml: string
  pinned: boolean
  deletedAt: Date | null
  trashDays: number
  compressed: boolean
  createdAt: Date
  updatedAt: Date
}

export interface EntryVersion {
  id: number
  entryId: number
  title: string
  contentHtml: string
  compressed: boolean
  savedAt: Date
}

export interface SearchIndexEntry {
  id?: number
  entryId: number
  token: string
}

export const DEFAULT_TRASH_DAYS = 7
export const MAX_VERSIONS = 5

export class WikiMeDB extends Dexie {
  sections!: Table<Section, number>
  categories!: Table<Category, number>
  entries!: Table<Entry, number>
  versions!: Table<EntryVersion, number>
  searchIndex!: Table<SearchIndexEntry, number>

  constructor() {
    super('WikiMeDB')
    this.version(5).stores({
      sections: '++id, name',
      categories: '++id, name, sectionId',
      entries: '++id, categoryId, title, pinned, updatedAt, deletedAt, [categoryId+deletedAt], [categoryId+pinned+updatedAt]',
      versions: '++id, entryId, savedAt, [entryId+savedAt]',
      searchIndex: '++id, entryId, token',
    }).upgrade(async tx => {
      await tx.table('entries').toCollection().modify(e => {
        if (e.deletedAt === undefined) e.deletedAt = null
        if (e.trashDays === undefined) e.trashDays = DEFAULT_TRASH_DAYS
      })
    })
    this.version(6).stores({
      sections: '++id, name',
      categories: '++id, name, sectionId',
      entries: '++id, categoryId, title, pinned, updatedAt, deletedAt, [categoryId+deletedAt], [categoryId+pinned+updatedAt]',
      versions: '++id, entryId, savedAt, [entryId+savedAt]',
      searchIndex: '++id, entryId, token',
    }).upgrade(async tx => {
      await tx.table('entries').toCollection().modify(e => {
        if (e.compressed === undefined) e.compressed = false
      })
      await tx.table('versions').toCollection().modify(e => {
        if (e.compressed === undefined) e.compressed = false
      })
    })
  }
}

export const db = new WikiMeDB()
