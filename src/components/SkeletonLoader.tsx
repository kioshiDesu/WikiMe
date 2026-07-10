export function CategorySkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 min-h-[100px] animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-2.5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  )
}

export function EntrySkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )
}

export function ContentSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      <div className="h-6 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="space-y-2 pt-4">
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )
}
