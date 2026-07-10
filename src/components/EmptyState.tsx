import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInbox } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

interface EmptyStateProps {
  icon?: IconDefinition
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon = faInbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <FontAwesomeIcon icon={icon} className="w-7 h-7 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium active:bg-teal-600 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
