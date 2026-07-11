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
