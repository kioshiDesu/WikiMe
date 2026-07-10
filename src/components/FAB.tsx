import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'

interface FABProps {
  onClick: () => void
}

export function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-teal-500 text-white shadow-lg shadow-teal-500/20 dark:shadow-teal-400/10 flex items-center justify-center active:bg-teal-600 active:scale-95 hover:shadow-xl hover:shadow-teal-500/25 dark:hover:shadow-teal-400/15 transition-all"
    >
      <FontAwesomeIcon icon={faPlus} className="w-6 h-6" />
    </button>
  )
}
