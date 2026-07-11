import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup, faCog, faFileLines, faFolder, faChevronLeft, faThumbtack, faPen, faTrashCan, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import { useHeader } from '../context/HeaderContext'
import { useCategories } from '../hooks/useCategories'
import { useSections } from '../hooks/useSections'
import { useEntries } from '../hooks/useEntries'
import { useSessionState } from '../hooks/useSessionState'
import { CategoryCard } from '../components/CategoryCard'
import { EmptyState } from '../components/EmptyState'
import { SearchBar } from '../components/SearchBar'
import { EntryCard } from '../components/EntryCard'
import { Modal, ConfirmModal } from '../components/Modal'
import { useToast } from '../context/ToastContext'
import { FAB } from '../components/FAB'
import { iconLookup } from '../utils/icons'
import { getRecentEntries, clearRecentEntries, type RecentEntry } from '../utils/recent'
import { db, type Entry } from '../db/db'
import { searchEntries, rebuildAllSearchIndexes } from '../utils/searchIndex'
import type { Category } from '../types'

interface SearchResult {
  id: number
  categoryId: number
  categoryName: string
  categoryColor: string
  title: string
  contentHtml: string
  pinned: boolean
  updatedAt: string
}

function SectionBlock({ section, children, isOdd, onDelete }: {
  section: { id: number; name: string; icon: string }
  children: React.ReactNode
  isOdd: boolean
  onDelete: (id: number) => void
}) {
  const nav = useNavigate()
  return (
    <div className={isOdd ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900/50'}>
      <div className="flex items-center gap-2 px-4 pt-5 pb-2">
        <FontAwesomeIcon icon={iconLookup(section.icon)} className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <span className="flex-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">
          {section.name}
        </span>
        <button
          onClick={() => nav(`/section/${section.id}`)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 active:bg-gray-200 dark:active:bg-gray-700 transition-all"
        >
          <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDelete(section.id!)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 active:bg-gray-200 dark:active:bg-gray-700 transition-all"
        >
          <FontAwesomeIcon icon={faTrashCan} className="w-3 h-3" />
        </button>
      </div>
      {children}
    </div>
  )
}

function groupCategoriesByLetter(categories: Category[]): { letter: string; categories: Category[] }[] {
  const groups: Record<string, Category[]> = {}
  for (const cat of categories) {
    const first = cat.name.trim()[0] || '#'
    const letter = /[a-zA-Z]/.test(first) ? first.toUpperCase() : '#'
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(cat)
  }
  const sorted = Object.entries(groups).sort(([a], [b]) =>
    a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)
  )
  return sorted.map(([letter, cats]) => ({ letter, categories: cats }))
}

export function HomePage() {
  const { setConfig } = useHeader()
  const { categories, loading, refresh: refreshCategories } = useCategories()
  const { sections, deleteSection, refresh: refreshSections } = useSections()
  const { entries, refresh: refreshEntries } = useEntries()
  const navigate = useNavigate()
  const [query, setQuery] = useSessionState('wikime_search', '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showFabModal, setShowFabModal] = useState(false)
const [fabStep, setFabStep] = useState<1 | 2 | 3 | 4>(1)
const [catSearch, setCatSearch] = useState('')
const [aiResponse, setAiResponse] = useState('')
const [aiCategories, setAiCategories] = useState<Category[]>([])
const [aiSections, setAiSections] = useState<import('../db/db').Section[]>([])
const [selectedCatId, setSelectedCatId] = useState<number | null>(null)
const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([])
const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())
const seedingRef = useRef(false)
const [deleteSectionId, setDeleteSectionId] = useState<number | null>(null)
const { showToast } = useToast()

  const closeFabModal = useCallback(() => setShowFabModal(false), [])
  const closeDeleteSection = useCallback(() => setDeleteSectionId(null), [])

  const categoryMap = useMemo(() => {
    const map = new Map<number, { name: string; color: string }>()
    categories.forEach(c => map.set(c.id, { name: c.name, color: c.color }))
    return map
  }, [categories])

  const handleDeleteSection = async () => {
    if (deleteSectionId === null) return
    await deleteSection(deleteSectionId)
    showToast('Section deleted', 'success')
    setDeleteSectionId(null)
  }

  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  useEffect(() => {
    setRecentEntries(getRecentEntries())
  }, [])

  useEffect(() => {
    if (loading || seedingRef.current) return
    if (categories.length === 0 && sections.length === 0) {
      seedingRef.current = true
      const now = new Date()
      db.sections.add({ name: 'Getting Started', icon: 'rocket', sortOrder: Date.now(), createdAt: now, updatedAt: now } as any)
        .then(sectionId =>
          db.categories.add({ name: 'Welcome Notes', icon: 'star', color: '#14b8a6', sectionId: sectionId as number, sortOrder: 0, createdAt: now, updatedAt: now } as any)
            .then(catId =>
              db.entries.add({
                categoryId: catId as number, title: 'Welcome to WikiMe!', contentHtml: '<h2>Welcome!</h2><p>This is your first note. Use the <strong>toolbar below</strong> to format your text:</p><ul><li><strong>Bold</strong> — make text stand out</li><li><em>Italic</em> — add emphasis</li><li><u>Underline</u> — highlight important words</li><li><s>Strikethrough</s> — mark things as done</li><li><strong>Headings</strong> — organize with H1 titles</li><li><strong>Bullet lists</strong> · <strong>Numbered lists</strong> · <strong>Task lists</strong> — check off items with <code>[ ]</code> toggles</li><li><strong>Tables</strong> — add structure with rows and columns</li><li><blockquote>Blockquotes — quote sources or key ideas</blockquote></li><li><strong>Code blocks</strong> — write technical snippets:<br/><pre><code>console.log(&quot;Hello, WikiMe!&quot;)</code></pre></li></ul><p>Create new entries with the <strong>+</strong> button, organize them into categories, and group categories into sections.</p>',
                pinned: true, createdAt: now, updatedAt: now,
              } as any)
            )
        )
        .then(() => { refreshCategories(); refreshSections(); refreshEntries(); rebuildAllSearchIndexes(db).catch(() => {}) })
        .catch(() => showToast('Failed to create starter data', 'error'))
        .finally(() => { seedingRef.current = false })
    }
  }, [loading, categories, sections, refreshCategories, refreshSections, refreshEntries])

  const filteredCategories = useMemo(
    () => catSearch.trim()
      ? categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
      : categories,
    [categories, catSearch]
  )

  useEffect(() => {
    setConfig({
      title: 'WikiMe',
      rightAction: (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/settings')}
            className="min-w-10 min-h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-all"
          >
            <FontAwesomeIcon icon={faCog} className="w-5 h-5" />
          </button>
        </div>
      ),
    })
  }, [setConfig, navigate])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    searchEntries(db, query).then(entryIds => {
      if (cancelled) return
      if (entryIds.length === 0) {
        setResults([])
        setSearching(false)
        return
      }
      db.entries.bulkGet(entryIds).then(entries => {
        if (cancelled) return
        const valid = entries.filter((e): e is Entry => e !== undefined && e.deletedAt == null)
        const mapped: SearchResult[] = valid.map(e => {
          const cat = categoryMap.get(e.categoryId)
          return {
            id: e.id!,
            categoryId: e.categoryId,
            categoryName: cat?.name || 'Uncategorized',
            categoryColor: cat?.color || '#94a3b8',
            title: e.title || '',
            contentHtml: e.contentHtml || '',
            pinned: e.pinned,
            updatedAt: e.updatedAt?.toISOString() || '',
          }
        })
        setResults(mapped)
        setSearching(false)
      })
    })
    return () => { cancelled = true }
  }, [query, categoryMap])



  const getCount = (catId: number) =>
    entries.filter(e => e.categoryId === catId).length

  const grouped = useMemo(() => {
    const sorted = [...sections].sort((a, b) => a.name.localeCompare(b.name))
    const g: { section: typeof sections[0]; cats: Category[] }[] = []
    for (const s of sorted) {
      const cats = categories.filter(c => c.sectionId === s.id).sort((a, b) => a.name.localeCompare(b.name))
      g.push({ section: s, cats })
    }
    const uncategorized = categories.filter(c => c.sectionId == null).sort((a, b) => a.name.localeCompare(b.name))
    if (uncategorized.length) {
      g.push({ section: { id: -1, name: 'Uncategorized', icon: 'folder', sortOrder: 0, createdAt: new Date(), updatedAt: new Date() } as import('../db/db').Section, cats: uncategorized })
    }
    return g
  }, [categories, sections])

  return (
    <>
      {!loading && categories.length === 0 && sections.length === 0 && !query.trim() ? (
        <>
          <SearchBar value={query} onChange={setQuery} />
          <EmptyState
            icon={faLayerGroup}
            title="Welcome to WikiMe"
            description="Create a section to start organizing your notes into categories."
            action={{ label: 'Create Section & Category', onClick: () => navigate('/section/new', { state: { redirectToCategory: true } }) }}
          />
          <FAB onClick={() => { setFabStep(1); setCatSearch(''); setShowFabModal(true) }} />
        </>
      ) : (
        <div className="pb-6 animate-fade-in">
          <SearchBar value={query} onChange={setQuery} />

          {query.trim() ? (
            results.length === 0 && !searching ? (
              <EmptyState
                icon={faLayerGroup}
            title="No results"
            description={`Nothing matches "${query}" — try a different search term.`}
              />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {results.map(entry => (
                  <div key={entry.id}>
                    <div className="flex items-center gap-1.5 px-4 pt-3 pb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.categoryColor }} />
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                        {entry.categoryName}
                      </span>
                    </div>
                    <EntryCard entry={entry as any} onClick={() => navigate(`/entry/${entry.id}`)} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <div>
              <div>
              <div className="flex items-center gap-2 px-4 pt-5 pb-2">
                <FontAwesomeIcon icon={faThumbtack} className="w-3.5 h-3.5 text-teal-500 rotate-45" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pinned
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <AnimatePresence mode="popLayout">
                  {entries.filter(e => e.pinned).map(entry => (
                    <EntryCard key={entry.id} entry={entry} onClick={() => navigate(`/entry/${entry.id}`)} />
                  ))}
                </AnimatePresence>
                {entries.filter(e => e.pinned).length === 0 && (
                  <div className="px-4 py-3 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Pin entries to keep them handy — tap the pin icon on any entry</p>
                  </div>
                )}
              </div>
            </div>
              <div>
                <div className="flex items-center justify-between px-4 pt-5 pb-2">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faFileLines} className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Recently Viewed
                      </span>
                    </div>
                    {recentEntries.some(r => entries.some(e => e.id === r.id)) && (
                      <button
                        onClick={() => { clearRecentEntries(); setRecentEntries([]) }}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    <AnimatePresence mode="popLayout">
                      {(() => {
                        const groups: { catId: number; catName: string; catColor: string; entries: Entry[] }[] = []
                        let lastCatId: number | null = null
                        for (const r of recentEntries) {
                          const entry = entries.find(e => e.id === r.id)
                          if (!entry) continue
                          const cat = categoryMap.get(entry.categoryId)
                          const catId = entry.categoryId
                          if (catId === lastCatId && groups.length) {
                            groups[groups.length - 1].entries.push(entry)
                          } else {
                            groups.push({ catId, catName: cat?.name || 'Unknown', catColor: cat?.color || '#6b7280', entries: [entry] })
                            lastCatId = catId
                          }
                        }
                        return groups.flatMap(group =>
                          group.entries.map((entry, i) => (
                            <div key={entry.id}>
                              {i === 0 && (
                                <div className="flex items-center gap-1.5 px-4 pt-3 pb-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.catColor }} />
                                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                    {group.catName}
                                  </span>
                                </div>
                              )}
                              <EntryCard entry={entry} onClick={() => navigate(`/entry/${entry.id}`)} />
                            </div>
                          ))
                        )
                      })()}
                    </AnimatePresence>
                    {(!recentEntries.length || recentEntries.every(r => !entries.some(e => e.id === r.id))) && (
                      <div className="px-4 py-3 text-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Entries you view will appear here for quick access</p>
                      </div>
                    )}
                  </div>
                </div>
              <AnimatePresence mode="popLayout">
                {grouped.map((g, idx) => (
                  <SectionBlock key={g.section.id} section={g.section} isOdd={idx % 2 === 1} onDelete={id => setDeleteSectionId(id)}>
                    {g.cats.length === 0 ? (
                      <div className="px-4 pb-4">
                        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
                          <p className="text-xs text-gray-400 dark:text-gray-500">No categories in this section</p>
                          <button
                            onClick={() => navigate('/category/new', { state: { sectionId: g.section.id } })}
                            className="mt-2 text-xs font-medium text-teal-500 active:text-teal-600"
                          >
                            Add Category
                          </button>
                        </div>
                      </div>
                    ) : g.cats.length > 30 ? (
                      <div className="px-4 pb-2 space-y-2">
                        {groupCategoriesByLetter(g.cats).map(group => (
                          <div key={group.letter}>
                            <div className="sticky top-0 z-10 flex items-center gap-2 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800">
                              {group.letter}
                              <span className="text-[9px] font-normal text-gray-300 dark:text-gray-600">{group.categories.length}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                              {group.categories.map(cat => (
                                <CategoryCard key={cat.id} category={cat} entryCount={getCount(cat.id!)} onClick={() => navigate(`/category/${cat.id}`)} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 pb-2 grid grid-cols-3 gap-2">
                        <AnimatePresence mode="popLayout">
                          {(expandedSections.has(g.section.id!) ? g.cats : g.cats.slice(0, 3)).map(cat => (
                            <CategoryCard
                              key={cat.id}
                              category={cat}
                              entryCount={getCount(cat.id!)}
                              onClick={() => navigate(`/category/${cat.id}`)}
                            />
                          ))}
                          {g.cats.length > 3 && !expandedSections.has(g.section.id!) && (
                            <motion.button
                              layout
                              key="show-more"
                              onClick={() => toggleSection(g.section.id!)}
                              className="flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 h-14 bg-transparent active:scale-95 transition-all"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15 }}
                            >
                              <span className="text-xs font-medium text-teal-500">+{g.cats.length - 3} more</span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                        {g.cats.length > 3 && expandedSections.has(g.section.id!) && (
                          <button
                            onClick={() => toggleSection(g.section.id!)}
                            className="col-span-3 text-center text-xs text-teal-500 py-2 active:text-teal-600 transition-colors"
                          >
                            Show less
                          </button>
                        )}
                      </div>
                    )}
                  </SectionBlock>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!query.trim() && <FAB onClick={() => { setFabStep(1); setCatSearch(''); setShowFabModal(true) }} />}
        </div>
      )}

      <ConfirmModal
        open={deleteSectionId !== null}
        onClose={closeDeleteSection}
        onConfirm={handleDeleteSection}
        title="Delete Section"
        message="All categories and entries in this section will be permanently deleted. This cannot be undone."
      />

      <Modal
        open={showFabModal}
        onClose={closeFabModal}
        title={fabStep === 1 ? 'New...' : fabStep === 2 ? 'Choose section' : fabStep === 3 ? 'AI Assistant' : 'Choose category'}
      >
        {fabStep === 1 ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setFabStep(2); setAiResponse(''); setSelectedCatId(null); setSelectedSectionId(null); setCopyStatus('idle'); db.sections.toArray().then(secs => { setAiSections(secs); if (secs.length) setSelectedSectionId(secs[0].id!) }) }}
              className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Assistant</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Create entries with AI (generates categories)</div>
              </div>
            </button>
            <button
              onClick={() => { setShowFabModal(false); navigate('/category/new') }}
              className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faLayerGroup} className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">New Category</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Create a new group for entries</div>
              </div>
            </button>
            <button
              onClick={() => { setShowFabModal(false); navigate('/section/new') }}
              className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faFolder} className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">New Section</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Organize categories into groups</div>
              </div>
            </button>
            <button
              onClick={() => setFabStep(4)}
              className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faFileLines} className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">New Entry</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Add a note to a category</div>
              </div>
            </button>
          </div>
        ) : fabStep === 2 ? (
          <div>
            <button
              onClick={() => setFabStep(1)}
              className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400 active:text-gray-700 dark:active:text-gray-200 transition-colors"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
              Back
            </button>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 max-h-[65vh] overflow-y-auto -mx-1 px-1">
              <p className="text-xs text-gray-500">1. Choose a section for the new entry. AI will create categories inside it.</p>
              {aiSections.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No sections yet. Create one from home first.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {aiSections.map(sec => (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSectionId(sec.id!)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all ${
                        selectedSectionId === sec.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 font-medium'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
                      }`}
                    >
                      <FontAwesomeIcon icon={iconLookup(sec.icon)} className="w-3 h-3" style={{ color: '#6b7280' }} />
                      {sec.name}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">2. Copy the reference and paste it into your AI chat.</p>
              <div className="relative">
                <pre id="formatting-ref-text" className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap max-h-28">You are a WikiMe note assistant. WikiMe stores notes as HTML.

OUTPUT FORMAT for EACH note:
TITLE: Short descriptive title
CATEGORIES: CategoryName1, CategoryName2
CONTENT: &lt;h2&gt;Heading&lt;/h2&gt;&lt;p&gt;Body text.&lt;/p&gt;

Separate multiple notes with:
---

CATEGORIES field — DECIDE a fitting category name based on topic. Use existing ones if they fit, or invent new ones. Max 3 categories per note.

AVAILABLE HTML TAGS (use ONLY these):
• &lt;h1&gt; &lt;h2&gt; &lt;h3&gt; — Headings
• &lt;p&gt; — Paragraph (with style="text-align: left/center/right/justify")
• &lt;strong&gt; — Bold
• &lt;em&gt; — Italic
• &lt;u&gt; — Underline
• &lt;s&gt; — Strikethrough
• &lt;ul&gt;&lt;li&gt; — Bullet list
• &lt;ol&gt;&lt;li&gt; — Numbered list
• &lt;ul data-type="taskList"&gt;&lt;li data-type="taskItem" data-checked="true"&gt; — Task list (checked)
• &lt;ul data-type="taskList"&gt;&lt;li data-type="taskItem"&gt; — Task list (unchecked)
• &lt;blockquote&gt; — Quote
• &lt;pre&gt;&lt;code&gt; — Code block
• &lt;table&gt; &lt;thead&gt; &lt;tbody&gt; &lt;tr&gt; &lt;th&gt; &lt;td&gt; — Table
• &lt;img src="..."&gt; — Image
• &lt;audio controls src="..."&gt;&lt;/audio&gt; — Audio recording
• &lt;hr&gt; — Horizontal rule

RULES:
• Use ONLY the tags listed above — no divs, spans, or other HTML
• Task items need data-type="taskItem" on &lt;li&gt; and data-type="taskList" on &lt;ul&gt;
• Use data-checked="true" for completed tasks
• Include style="text-align: ..." on &lt;p&gt; for alignment
• Tables must have &lt;thead&gt; + &lt;tbody&gt; structure

EXAMPLE single note:
TITLE: Weekend Plans
CATEGORIES: Personal, Tasks
CONTENT: &lt;h1&gt;To-Do&lt;/h1&gt;&lt;ul data-type="taskList"&gt;&lt;li data-type="taskItem"&gt;Shop&lt;/li&gt;&lt;li data-type="taskItem" data-checked="true"&gt;Call mom&lt;/li&gt;&lt;/ul&gt;

EXAMPLE multiple notes (separate with ---):
TITLE: Meeting Notes
CATEGORIES: Work
CONTENT: &lt;h2&gt;Q3 Review&lt;/h2&gt;&lt;p style="text-align: center"&gt;Revenue up 20%&lt;/p&gt;
---
TITLE: Recipe
CATEGORIES: Cooking
CONTENT: &lt;h2&gt;Pasta&lt;/h2&gt;&lt;ol&gt;&lt;li&gt;Boil water&lt;/li&gt;&lt;li&gt;Add pasta&lt;/li&gt;&lt;/ol&gt;</pre>
                <button
                  onClick={() => {
                    const el = document.getElementById('formatting-ref-text')
                    if (el) {
                      const text = el.textContent || ''
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(text)
                      } else {
                        const ta = document.createElement('textarea')
                        ta.value = text
                        ta.style.position = 'fixed'
                        ta.style.opacity = '0'
                        document.body.appendChild(ta)
                        ta.select()
                        document.execCommand('copy')
                        document.body.removeChild(ta)
                      }
                    }
                    setCopyStatus('copied')
                    setTimeout(() => setCopyStatus('idle'), 1500)
                  }}
                  className={`absolute top-2 right-2 px-2.5 py-1 text-[10px] font-medium border rounded-lg active:bg-gray-100 dark:active:bg-gray-800 transition-all ${
                    copyStatus === 'copied'
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                      : 'text-teal-600 dark:text-teal-400 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  }`}
                >{copyStatus === 'copied' ? 'Copied!' : 'Copy'}</button>
              </div>
              <hr className="border-gray-200 dark:border-gray-700" />
              <p className="text-xs text-gray-500">3. Paste the AI's response below, then tap Create Entry.</p>
              <textarea
                value={aiResponse}
                onChange={e => setAiResponse(e.target.value)}
                placeholder="Paste AI response here..."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
              />
              <button
                onClick={async () => {
                  if (!selectedSectionId) { showToast('Please select a section first', 'error'); return }
                  if (!aiResponse.trim()) { showToast('Paste AI response first', 'error'); return }
                  
                  // Parse multiple notes from AI response
                  const notes = aiResponse.split('---').map(note => {
                    const titleMatch = note.match(/TITLE:\s*(.+)/)
                    const catMatch = note.match(/CATEGORIES:\s*(.+)/)
                    const contentMatch = note.match(/CONTENT:\s*(.+)/)
                    if (!titleMatch || !contentMatch) return null
                    return {
                      title: titleMatch[1].trim(),
                      categories: catMatch ? catMatch[1].split(',').map(c => c.trim()).filter(Boolean) : [],
                      contentHtml: contentMatch[1].trim()
                    }
                  }).filter(Boolean)
                  
                  if (notes.length === 0) {
                    showToast('Could not parse any notes from response', 'error')
                    return
                  }
                  
                  const now = new Date()
                  let createdCount = 0
                  let firstEntryId: number | null = null
                  
                  for (const note of notes) {
                    // Create/get categories
                    let catId: number | null = null
                    for (const catName of note.categories) {
                      let cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase() && c.sectionId === selectedSectionId)
                      if (!cat) {
                        const now = new Date()
                        const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
                        const newId = await db.categories.add({ 
                          name: catName, 
                          icon: 'star', 
                          color, 
                          sectionId: selectedSectionId, 
                          sortOrder: Date.now(), 
                          createdAt: now, 
                          updatedAt: now 
                        } as any)
                        cat = { ...catName, id: newId, name: catName, color, sectionId: selectedSectionId } as any
                      }
                      catId = cat.id!
                      break // Use first category
                    }
                    
                    if (!catId) {
                      // Create first category if none matched
                      const firstCat = note.categories[0] || 'AI Notes'
                      const now = new Date()
                      const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
                      const newId = await db.categories.add({ 
                        name: firstCat, 
                        icon: 'star', 
                        color, 
                        sectionId: selectedSectionId, 
                        sortOrder: Date.now(), 
                        createdAt: now, 
                        updatedAt: now 
                      } as any)
                      catId = newId
                    }
                    
                    const id = await db.entries.add({ 
                      title: note.title, 
                      contentHtml: note.contentHtml, 
                      categoryId: catId, 
                      pinned: false, 
                      createdAt: now, 
                      updatedAt: now 
                    } as any)
                    
                    if (!firstEntryId) firstEntryId = id
                    createdCount++
                    const { addRecentEntry } = await import('../utils/recent')
                    addRecentEntry({ id: id as number, title: note.title, categoryId: catId })
                  }
                  
                  if (createdCount > 0) {
                    showToast(`Created ${createdCount} entr${createdCount === 1 ? 'y' : 'ies'}`, 'success')
                    setShowFabModal(false)
                    setAiResponse('')
                    setSelectedSectionId(null)
                    setSelectedCatId(null)
                    if (firstEntryId) navigate(`/entry/${firstEntryId}`)
                  }
                }}
                disabled={!aiResponse.trim() || !selectedSectionId}
                className="w-full py-2.5 text-sm font-medium text-white bg-teal-500 rounded-xl active:bg-teal-600 disabled:opacity-40 transition-all"
              >Create Entries</button>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setFabStep(1)}
              className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400 active:text-gray-700 dark:active:text-gray-200 transition-colors"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
              Back
            </button>
            <input
              type="text"
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full mb-3 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 border-none outline-none focus:ring-2 focus:ring-teal-500/50"
              autoFocus
            />
            {categories.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">No categories yet. Create one first.</p>
                <button
                  onClick={() => { setShowFabModal(false); navigate('/category/new', { state: { redirectToEntry: true } }) }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-teal-500 active:bg-teal-600 transition-colors"
                >
                  Create Category
                </button>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 dark:text-gray-500">No categories match "{catSearch}"</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setShowFabModal(false); navigate(`/entry/new/${cat.id}`) }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-all text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cat.color + '30' }}
                    >
                      <FontAwesomeIcon icon={iconLookup(cat.icon)} className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
