import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faThumbtack, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { formatRelative } from '../utils/time'
import type { Entry } from '../types'

interface EntryCardProps {
  entry: Entry
  onClick: () => void
}

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || ''
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

export function EntryCard({ entry, onClick }: EntryCardProps) {
  const html = entry.contentHtml || ''
  const text = html ? stripHtml(html) : ''
  const preview = text ? truncate(text, 100) : ''
  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3.5 bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800 transition-colors text-left group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {entry.pinned && (
            <FontAwesomeIcon icon={faThumbtack} className="w-3 h-3 text-teal-500 rotate-45 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-snug">
            {entry.title || 'Untitled'}
          </span>
        </div>
        {preview && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed line-clamp-2">
            {preview}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {formatRelative(entry.updatedAt)}
          </span>
          {words > 0 && (
            <>
              <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {words} {words === 1 ? 'word' : 'words'}
              </span>
            </>
          )}
        </div>
      </div>
      <FontAwesomeIcon
        icon={faChevronRight}
        className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-2.5 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors"
      />
    </motion.div>
  )
}
