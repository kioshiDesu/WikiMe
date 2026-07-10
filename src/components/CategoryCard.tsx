import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
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
      className="flex flex-col items-center justify-center gap-1.5 p-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 active:scale-95 transition-all h-[80px] w-full relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ backgroundColor: category.color }}
      />
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${category.color}18` }}
      >
        <FontAwesomeIcon
          icon={iconLookup(category.icon)}
          className="w-3.5 h-3.5"
          style={{ color: category.color }}
        />
      </div>
      <span className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 text-center leading-tight whitespace-nowrap overflow-x-auto w-full scrollbar-none">
        {category.name}
      </span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{entryCount}</span>
    </motion.button>
  )
}
