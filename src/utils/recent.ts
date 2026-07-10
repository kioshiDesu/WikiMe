const RECENT_KEY = 'wikime_recent'
const MAX = 3

export interface RecentEntry {
  id: number
  title: string
  categoryId: number
}

export function addRecentEntry(entry: RecentEntry) {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const list: RecentEntry[] = raw ? JSON.parse(raw) : []
    const filtered = list.filter(e => e.id !== entry.id)
    filtered.unshift(entry)
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX)))
  } catch {}
}

export function getRecentEntries(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function clearRecentEntries() {
  try { localStorage.removeItem(RECENT_KEY) } catch {}
}
