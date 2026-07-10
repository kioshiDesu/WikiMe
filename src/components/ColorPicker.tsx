export const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78716c',
  '#64748b',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Color ${color}`}
          className={`w-8 h-8 rounded-xl transition-all ${
            value === color
              ? 'ring-2 ring-offset-2 ring-teal-500 dark:ring-offset-gray-900 scale-110'
              : ''
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
