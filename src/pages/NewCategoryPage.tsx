import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useHeader } from '../context/HeaderContext'
import { useCategories } from '../hooks/useCategories'
import { useSections } from '../hooks/useSections'
import { useToast } from '../context/ToastContext'
import { ColorPicker, COLORS } from '../components/ColorPicker'
import { IconPicker } from '../components/IconPicker'

export function NewCategoryPage() {
  const { setConfig } = useHeader()
  const { addCategory } = useCategories()
  const { sections } = useSections()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[7])
  const [icon, setIcon] = useState('book')
  const [sectionId, setSectionId] = useState<number | undefined>(
    (location.state as any)?.sectionId || undefined
  )

  useEffect(() => {
    if (sectionId === undefined && sections.length > 0) {
      setSectionId(sections[0].id)
    }
  }, [sections, sectionId])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setConfig({ title: 'New Category', showBack: true, onBack: () => navigate('/') })
  }, [setConfig, navigate])

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Please enter a name', 'error')
      return
    }
    setSaving(true)
    const sortOrder = Date.now()
    const newId = await addCategory({ name: name.trim(), icon, color, sortOrder, sectionId: sectionId ?? null })
    showToast('Category created', 'success')
    if ((location.state as any)?.redirectToEntry) {
      navigate(`/entry/new/${newId}`)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Category name"
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          Section
        </label>
        <select
          value={sectionId ?? ''}
          onChange={e => setSectionId(Number(e.target.value))}
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500/50 transition-all appearance-none"
        >
          {sections.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          Color
        </label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          Icon
        </label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-teal-500 text-white rounded-xl text-sm font-medium active:bg-teal-600 disabled:opacity-50 transition-all"
      >
        {saving ? 'Creating...' : 'Create Category'}
      </button>
    </div>
  )
}
