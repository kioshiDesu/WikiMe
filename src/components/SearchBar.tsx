import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div className="relative mx-4 my-3">
      <FontAwesomeIcon
        icon={faSearch}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 border-none outline-none ring-0 focus:ring-2 focus:ring-teal-500/50 transition-all"
        autoComplete="off"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center"
        >
          <FontAwesomeIcon icon={faTimes} className="w-2.5 h-2.5 text-white" />
        </button>
      )}
    </div>
  )
}
