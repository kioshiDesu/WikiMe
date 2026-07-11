import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faUpload, faInfoCircle, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useHeader } from '../context/HeaderContext'
import { useToast } from '../context/ToastContext'
import { exportData, executeImport } from '../utils/exportImport'
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

  const [importing, setImporting] = useState(false)

  useEffect(() => {
    setConfig({ title: 'Settings', showBack: true })
  }, [setConfig])

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
    setImporting(true)
    try {
      const text = await file.text()
      await executeImport(text)
      showToast('Data imported successfully', 'success')
      navigate('/')
    } catch {
      showToast('Invalid backup file', 'error')
      setImporting(false)
    }
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
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3" />
          <span>WikiMe v1.0 — All data stored locally on your device.</span>
        </div>
      </div>

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
