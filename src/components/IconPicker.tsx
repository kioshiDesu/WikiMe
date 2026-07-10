import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { iconLookup, ICON_NAMES } from '../utils/icons'

const ICONS_PER_PAGE = 24

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filtered = search
    ? ICON_NAMES.filter(name => name.includes(search.toLowerCase()))
    : ICON_NAMES

  const displayed = filtered.slice(0, (page + 1) * ICONS_PER_PAGE)
  const hasMore = displayed.length < filtered.length

  return (
    <div>
      <div className="relative mb-3">
        <FontAwesomeIcon
          icon={faSearch}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search icons..."
          className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
        />
      </div>
      <div className="grid grid-cols-6 gap-2">
        {displayed.map(name => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={`w-full aspect-square flex items-center justify-center rounded-xl transition-all ${
              value === name
                ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 ring-2 ring-teal-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 active:bg-gray-200 dark:active:bg-gray-700'
            }`}
          >
            <FontAwesomeIcon icon={iconLookup(name)} className="w-5 h-5" />
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setPage(p => p + 1)}
          className="w-full mt-3 py-2 text-sm text-teal-500 font-medium active:text-teal-600"
        >
          Show more ({filtered.length - displayed.length} remaining)
        </button>
      )}
    </div>
  )
}
