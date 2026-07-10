import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useHeader } from '../context/HeaderContext'
import { useSections } from '../hooks/useSections'
import { useToast } from '../context/ToastContext'
import { IconPicker } from '../components/IconPicker'
import { db } from '../db/db'
import type { Section } from '../types'

export function NewSectionPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = !!id
  const sectionId = isEditing ? Number(id) : undefined

  const [existingSection, setExistingSection] = useState<Section | null>(null)

  useEffect(() => {
    if (!sectionId) { setExistingSection(null); return }
    db.sections.get(sectionId).then(found => {
      if (found) setExistingSection(found)
    })
  }, [sectionId])

  const { addSection, updateSection } = useSections()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { setConfig } = useHeader()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('folder')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existingSection) {
      setName(existingSection.name)
      setIcon(existingSection.icon)
    }
  }, [existingSection])

  useEffect(() => {
    setConfig({
      title: isEditing ? 'Edit Section' : 'New Section',
      showBack: true,
    })
  }, [setConfig, isEditing])

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Please enter a name', 'error')
      return
    }
    setSaving(true)
    try {
      let newId: number | undefined
      if (isEditing && sectionId) {
        await updateSection(sectionId, { name: name.trim(), icon })
        showToast('Section updated', 'success')
      } else {
        newId = await addSection({ name: name.trim(), icon, sortOrder: Date.now() })
        showToast('Section created', 'success')
      }
      const redirectToCategory = (location.state as any)?.redirectToCategory
      if (redirectToCategory && newId) {
        navigate(`/category/new`, { state: { sectionId: newId } })
      } else {
        navigate('/')
      }
    } catch {
      showToast('Failed to save', 'error')
    } finally {
      setSaving(false)
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
          placeholder="Section name"
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
          autoFocus
        />
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
        {saving ? 'Saving...' : isEditing ? 'Update Section' : 'Create Section'}
      </button>
    </div>
  )
}
