import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { iconLookup } from '../utils/icons'
import type { Category } from '../types'

interface CategoryCardProps {
  category: Category
  entryCount: number
  onClick: () => void
}

export function CategoryCard({ category, entryCount, onClick }: CategoryCardProps) {
  return (
    <motion.button
      layout
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 active:opacity-80 transition-all w-full relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute inset-y-0 left-0 w-0.5" style={{ backgroundColor: category.color }} />
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundColor: category.color }} />
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
        style={{ backgroundColor: `${category.color}20` }}
      >
        <FontAwesomeIcon
          icon={iconLookup(category.icon)}
          className="w-4 h-4"
          style={{ color: category.color }}
        />
      </div>
      <div className="flex-1 text-left min-w-0 relative">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block truncate">
          {category.name}
        </span>
      </div>
      <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500 font-medium relative">
        {entryCount}
      </span>
      <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0 relative" />
    </motion.button>
  )
}
