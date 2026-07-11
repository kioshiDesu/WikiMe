import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faUpload, faInfoCircle, faTrash, faFileLines, faFolder, faLayerGroup, faClock } from '@fortawesome/free-solid-svg-icons'
import { useHeader } from '../context/HeaderContext'
import { useToast } from '../context/ToastContext'
import { exportData, analyzeImport, executeImport } from '../utils/exportImport'
import type { EntryConflict } from '../utils/exportImport'
import { Modal } from '../components/Modal'
import { db } from '../db/db'

export function SettingsPage() {
  const { setConfig } = useHeader()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [showErase, setShowErase] = useState(false)
  const [captchaInput, setCaptchaInput] = useState('')
  const [eraseLoading, setEraseLoading] = useState(false)

  const closeEraseModal = useCallback(() => { setShowErase(false); setCaptchaInput('') }, [])

  const [captchaA] = useState(() => Math.floor(Math.random() * 20) + 1)
  const [captchaB] = useState(() => Math.floor(Math.random() * 20) + 1)

  const captchaAnswer = useMemo(() => captchaA + captchaB, [captchaA, captchaB])
  const captchaCorrect = String(captchaAnswer) === captchaInput.trim()

  const [importRaw, setImportRaw] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<EntryConflict[]>([])
  const [overwriteSet, setOverwriteSet] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)

  const [stats, setStats] = useState<{ entries: number; categories: number; sections: number; joinedDays: number } | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [entryCount, catCount, secCount] = await Promise.all([
          db.entries.count(),
          db.categories.count(),
          db.sections.count(),
        ])
        let earliestEntry: Date | null = null
        let earliestCat: Date | null = null
        let earliestSec: Date | null = null
        try {
          const e = await db.entries.orderBy('updatedAt').first()
          if (e?.updatedAt) earliestEntry = new Date(e.updatedAt)
        } catch {}
        try {
          const c = await db.categories.orderBy('createdAt').first()
          if (c?.createdAt) earliestCat = new Date(c.createdAt)
        } catch {}
        try {
          const s = await db.sections.orderBy('createdAt').first()
          if (s?.createdAt) earliestSec = new Date(s.createdAt)
        } catch {}
        const dates = [earliestEntry, earliestCat, earliestSec].filter(Boolean) as Date[]
        const earliest = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date()
        const joinedDays = Math.max(1, Math.floor((Date.now() - earliest.getTime()) / 86400000))
        setStats({ entries: entryCount, categories: catCount, sections: secCount, joinedDays })
      } catch {
        setStats({ entries: 0, categories: 0, sections: 0, joinedDays: 1 })
      }
    }
    loadStats()
  }, [])

  useEffect(() => {
    setConfig({ title: 'Settings', showBack: true, onBack: () => navigate('/') })
  }, [setConfig, navigate])

  const handleExport = async () => {
    try {
      const uri = await exportData()
      showToast(`Backup saved to Downloads`, 'success')
    } catch (e) {
      showToast(`Export failed: ${e}`, 'error')
    }
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const result = await analyzeImport(text)
      if (result.conflicts.length === 0) {
        setImporting(true)
        await executeImport(text, new Set())
        showToast('Data imported successfully', 'success')
        navigate('/')
      } else {
        setImportRaw(text)
        setConflicts(result.conflicts)
        setOverwriteSet(new Set(result.conflicts.map(c => c.index)))
      }
    } catch {
      showToast('Invalid backup file', 'error')
    }
  }

  const toggleConflict = (index: number) => {
    setOverwriteSet(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleImport = async () => {
    if (!importRaw) return
    setImporting(true)
    try {
      await executeImport(importRaw, overwriteSet)
      showToast('Data imported successfully', 'success')
      navigate('/')
    } catch {
      showToast('Import failed', 'error')
      setImporting(false)
    }
  }

  const closeConflictModal = () => {
    setImportRaw(null)
    setConflicts([])
    setOverwriteSet(new Set())
  }

  const handleErase = async () => {
    setEraseLoading(true)
    try {
      await db.sections.clear()
      await db.categories.clear()
      await db.entries.clear()
      await db.versions.clear()
      await db.searchIndex.clear()
      navigate('/')
    } catch {
      showToast('Failed to reset data', 'error')
      setEraseLoading(false)
    }
  }

  const Row = ({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) => (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      onClick={onClick}
      className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800 transition-all"
    >
      <span className="text-sm text-gray-900 dark:text-gray-100">{label}</span>
      {children}
    </div>
  )

  return (
    <div className="space-y-1 pt-2">
      <Row label="Export Data">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg active:bg-gray-200 dark:active:bg-gray-700 transition-all"
        >
          <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
          Export
        </button>
      </Row>

      <Row label="Import Data">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg active:bg-gray-200 dark:active:bg-gray-700 transition-all"
        >
          <FontAwesomeIcon icon={faUpload} className="w-3 h-3" />
          Import
        </button>
      </Row>
      <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelected} className="hidden" />

      <div className="h-2" />

      <div className="h-2" />

      <Row label="Reset All Data">
        <button
          onClick={() => { setCaptchaInput(''); setShowErase(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg active:bg-red-100 dark:active:bg-red-900 transition-all"
        >
          <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
          Erase
        </button>
      </Row>

      <div className="h-2" />

      <div className="px-4 py-4">
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Dashboard</div>
        {stats ? (
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-900 rounded-xl">
              <FontAwesomeIcon icon={faFileLines} className="w-4 h-4 text-accent" />
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.entries}</span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Notes</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-900 rounded-xl">
              <FontAwesomeIcon icon={faFolder} className="w-4 h-4 text-accent" />
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.categories}</span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Categories</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-900 rounded-xl">
              <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4 text-accent" />
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.sections}</span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Sections</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-900 rounded-xl">
              <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-accent" />
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.joinedDays}</span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Days</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="h-2" />

      <div className="px-4 py-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3" />
          <span>WikiMe v1.0 — All data stored locally on your device.</span>
        </div>
      </div>

      <Modal
        open={conflicts.length > 0}
        onClose={closeConflictModal}
        title="Resolve Conflicts"
      >
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          {conflicts.length} entr{conflicts.length === 1 ? 'y' : 'ies'} with the same title already exist.
          <br />
          <strong className="text-gray-900 dark:text-gray-100">Checked</strong> = overwrite existing, <strong className="text-gray-900 dark:text-gray-100">unchecked</strong> = add as copy with a number suffix.
        </p>
        <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
          {conflicts.map(c => (
            <label
              key={c.index}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-all"
            >
              <input
                type="checkbox"
                checked={overwriteSet.has(c.index)}
                onChange={() => toggleConflict(c.index)}
                className="w-4 h-4 rounded accent-teal-500"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{c.categoryName}</div>
              </div>
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {overwriteSet.has(c.index) ? 'Overwrite' : 'Add copy'}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={closeConflictModal}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-teal-500 active:bg-teal-600 disabled:opacity-50 transition-all"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </Modal>

      <Modal
        open={showErase}
        onClose={closeEraseModal}
        title="Reset All Data"
      >
        <p className="mb-4 text-sm text-red-600 dark:text-red-400 font-medium">
          This will permanently delete all categories, entries, and sections. This cannot be undone.
        </p>
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            To confirm, solve: <strong className="text-gray-900 dark:text-gray-100">{captchaA} + {captchaB} = ?</strong>
          </p>
          <input
            type="number"
            value={captchaInput}
            onChange={e => setCaptchaInput(e.target.value)}
            placeholder="Your answer"
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 border-none outline-none focus:ring-2 focus:ring-red-500/50"
            autoFocus
          />
          <button
            onClick={handleErase}
            disabled={!captchaCorrect || eraseLoading}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 active:bg-red-600 disabled:opacity-50 transition-all"
          >
            {eraseLoading ? 'Resetting...' : 'Erase Everything'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
