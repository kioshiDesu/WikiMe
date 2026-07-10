import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { TextSelection } from 'prosemirror-state'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { AudioExtension } from './AudioExtension'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faBold, faItalic, faUnderline, faStrikethrough,
  faHeading, faListUl, faListOl, faListCheck, faQuoteLeft,
  faCode, faUndo, faRedo, faTable, faPalette,
  faAlignLeft, faAlignCenter, faAlignRight, faAlignJustify,
  faImage, faMicrophone, faStop, faXmark, faRotateLeft, faTrash, faCheck,
} from '@fortawesome/free-solid-svg-icons'

interface AudioRecorderModalProps {
  open: boolean
  onClose: () => void
  onInsert: (blob: Blob) => void
}

function AudioRecorderModal({ open, onClose, onInsert }: AudioRecorderModalProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'preview'>('idle')
  const [chunks, setChunks] = useState<BlobPart[]>([])
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    if (audioContextRef.current) audioContextRef.current.close()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }

  const drawWaveform = () => {
    const canvas = canvasRef.current
    if (!canvas || !analyserRef.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    const data = dataArrayRef.current!
    analyserRef.current.getByteFrequencyData(data)
    const barWidth = width / data.length * 2
    let x = 0
    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / 255) * height * 0.8
      const hue = 200 + (data[i] / 255) * 60
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
      ctx.fillRect(x, height - barHeight, barWidth, barHeight)
      x += barWidth + 1
    }
    animationRef.current = requestAnimationFrame(drawWaveform)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      const newChunks: BlobPart[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) newChunks.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(newChunks, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setChunks(newChunks)
        setState('preview')
      }
      recorder.start(100)
      setState('recording')
      setRecordingTime(0)
      setChunks([])
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)

      // Setup waveform visualization
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      analyserRef.current = analyser
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
      source.connect(analyser)
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = canvas.offsetWidth
        canvas.height = 60
      }
      drawWaveform()
    } catch (e) {
      console.error('Audio recording failed:', e)
      alert('Microphone access denied or unavailable')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (audioContextRef.current) audioContextRef.current.close()
  }

  const handleRecordAgain = () => {
    cleanup()
    startRecording()
  }

  const handleDelete = () => {
    cleanup()
    setState('idle')
    setAudioUrl(null)
    setChunks([])
    setRecordingTime(0)
  }

  const handleDone = () => {
    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      onInsert(blob)
    }
    cleanup()
    onClose()
  }

  const formatTime = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Audio Recording</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
          </button>
        </div>

        {state === 'idle' && (
          <div className="text-center py-4">
            <button onClick={startRecording} className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto hover:bg-emerald-600 transition-colors shadow-lg">
              <FontAwesomeIcon icon={faMicrophone} className="w-6 h-6" />
            </button>
          </div>
        )}

        {state === 'recording' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-rose-500 animate-pulse flex items-center justify-center mx-auto mb-3 shadow-lg">
              <FontAwesomeIcon icon={faStop} className="w-6 h-6 text-white" />
            </div>
            <p className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100 mb-2">{formatTime(recordingTime)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Recording...</p>
            <div className="flex gap-2 justify-center">
              <button onClick={stopRecording} className="px-3 py-1.5 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600">Stop</button>
              <button onClick={handleDelete} className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
            </div>
          </div>
        )}

        {state === 'preview' && (
          <div className="text-center py-4">
            <audio ref={audioRef} src={audioUrl} controls className="w-full mb-3" />
            <div className="flex gap-1.5 justify-center">
              <button onClick={handleRecordAgain} className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center justify-center gap-1">
                <FontAwesomeIcon icon={faRotateLeft} className="w-3 h-3" /> Again
              </button>
              <button onClick={handleDelete} className="px-3 py-1.5 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 flex items-center justify-center gap-1">
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" /> Delete
              </button>
              <button onClick={handleDone} className="px-3 py-1.5 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 flex items-center justify-center gap-1">
                <FontAwesomeIcon icon={faCheck} className="w-3 h-3" /> Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const HIGHLIGHT_COLORS = [
  { label: 'None', value: null },
  { label: 'Yellow', value: '#fef3c7' },
  { label: 'Green', value: '#d1fae5' },
  { label: 'Blue', value: '#dbeafe' },
  { label: 'Red', value: '#fecaca' },
  { label: 'Purple', value: '#e9d5ff' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Gray', value: '#f3f4f6' },
]

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || null,
        renderHTML: attrs => {
          if (!attrs.backgroundColor) return {}
          return { style: `background-color: ${attrs.backgroundColor}` }
        },
      },
    }
  },
})

interface RichEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichEditor({ content, onChange, placeholder = 'Start writing...' }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: { depth: 100 },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      CustomTableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'left' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      AudioExtension,
    ],
    content,
    onUpdate: ({ editor }) => {
      editorContentRef.current = editor.getHTML()
      onChange(editorContentRef.current)
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-full h-full px-4 py-3 text-gray-900 dark:text-gray-100',
      },
    },
  })

  const editorContentRef = useRef(content)
  useEffect(() => {
    if (editor && content !== editorContentRef.current) {
      editor.commands.setContent(content)
      editorContentRef.current = content
    }
  }, [content, editor])

  const [inTable, setInTable] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [showAudioModal, setShowAudioModal] = useState(false)
  const editorWrapperRef = useRef<HTMLDivElement>(null)
  const tableRectRef = useRef({ top: 0, left: 0, width: 0, height: 0 })
  const tableElRef = useRef<HTMLElement | null>(null)

  const updateTablePosition = useCallback(() => {
    if (!editor) return
    const active = editor.isActive('table')
    setInTable(active)
    if (active && editorWrapperRef.current) {
      const { view } = editor
      const { from } = view.state.selection
      const domPos = view.domAtPos(from)
      const el = domPos.node.nodeType === 3 ? domPos.node.parentElement : domPos.node
      const tableEl = (el as HTMLElement).closest('table') as HTMLElement | null
      if (tableEl) {
        tableElRef.current = tableEl
        const rect = tableEl.getBoundingClientRect()
        const wrapperRect = editorWrapperRef.current.getBoundingClientRect()
        tableRectRef.current = {
          top: rect.top - wrapperRect.top,
          left: rect.left - wrapperRect.left,
          width: rect.width,
          height: rect.height,
        }
      }
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return
    editor.on('selectionUpdate', updateTablePosition)
    editor.on('update', updateTablePosition)
    return () => {
      editor.off('selectionUpdate', updateTablePosition)
      editor.off('update', updateTablePosition)
    }
  }, [editor, updateTablePosition])

  useEffect(() => {
    if (!tableElRef.current) return
    const ro = new ResizeObserver(updateTablePosition)
    ro.observe(tableElRef.current)
    return () => ro.disconnect()
  }, [inTable, updateTablePosition])

  if (!editor) return null

  const runCmd = (fn: () => boolean) => {
    fn()
    requestAnimationFrame(() => updateTablePosition())
  }

  const Btn = ({ action, active, icon, label, text }: {
    action: () => void
    active?: boolean
    icon: IconDefinition
    label: string
    text?: string
  }) => (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(e) => { e.preventDefault(); action() }}
      className={`p-2 rounded-lg transition-colors inline-flex items-center gap-0.5 ${
        active
          ? 'bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400'
          : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
      }`}
      title={label}
    >
      <FontAwesomeIcon icon={icon} className="w-4 h-4" />
      {text && <span className="text-[10px] font-semibold leading-none">{text}</span>}
    </button>
  )

  const Divider = () => (
    <div role="separator" className="self-stretch w-px my-auto min-h-[50%] max-h-[90%] bg-gray-300 dark:bg-gray-600 mx-1" />
  )

  const handleCodeBlock = () => {
    if (!editor) return
    if (!editor.isActive('codeBlock')) {
      editor.chain().focus().setCodeBlock().run()
      return
    }
    const { state, dispatch } = editor.view
    const { from } = state.selection
    const $from = state.doc.resolve(from)
    const contentStart = $from.start()
    const contentEnd = $from.end()
    const textBefore = state.doc.textBetween(contentStart, from)
    const textAfter = state.doc.textBetween(from, contentEnd)
    const beforeLines = textBefore.split('\n')
    const afterLines = textAfter.split('\n')
    const cursorLineText = beforeLines.pop() || ''
    const afterFirstLine = afterLines.shift() || ''
    if (cursorLineText === '' && afterFirstLine === '') {
      const tr = state.tr
      const fullText = state.doc.textBetween(contentStart, contentEnd)
      const cursorOffset = from - contentStart
      let beforePart = fullText.slice(0, cursorOffset).replace(/\n+$/, '')
      let afterPart = fullText.slice(cursorOffset).replace(/^\n+/, '')
      const nodeStart = $from.before()
      const nodeEnd = $from.after()
      tr.delete(nodeStart, nodeEnd)
      let insertPos = nodeStart
      if (beforePart.length) {
        tr.insert(insertPos, state.schema.nodes.codeBlock.create(null, state.schema.text(beforePart)))
        insertPos += beforePart.length + 2
      }
      const paragraphNode = state.schema.nodes.paragraph.create()
      tr.insert(insertPos, paragraphNode)
      const cursorPos = insertPos + 1
      insertPos += 2
      if (afterPart.length) {
        tr.insert(insertPos, state.schema.nodes.codeBlock.create(null, state.schema.text(afterPart)))
      }
      tr.setSelection(TextSelection.create(tr.doc, cursorPos))
      dispatch(tr)
    } else {
      editor.chain().focus().clearNodes().run()
    }
  }

  const ColorBtn = ({ color }: { color: string | null }) => (
    <button
      type="button"
      onMouseDown={e => {
        e.preventDefault()
        if (color) editor?.chain().focus().setCellAttribute('backgroundColor', color).run()
        else editor?.chain().focus().setCellAttribute('backgroundColor', null).run()
        setShowColors(false)
      }}
      className={`w-5 h-5 rounded border border-gray-300 dark:border-gray-600`}
      style={{ backgroundColor: color || 'transparent' }}
    />
  )

  return (
    <div ref={editorWrapperRef} className="flex flex-col flex-1 min-h-0 relative">
      {inTable && (
        <>
          <div className="absolute z-50 flex items-center justify-center gap-1" style={{ top: Math.max(0, tableRectRef.current.top - 36), left: tableRectRef.current.left, width: tableRectRef.current.width }}>
            <button type="button" onMouseDown={e => { e.preventDefault(); runCmd(() => editor.chain().focus().addRowBefore().run()) }} className="w-5 h-5 flex items-center justify-center rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-all font-bold leading-none text-xs shadow-sm" title="Add row">+</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); runCmd(() => editor.chain().focus().deleteRow().run()) }} className="w-5 h-5 flex items-center justify-center rounded bg-rose-500 text-white hover:bg-rose-600 transition-all font-bold leading-none text-xs shadow-sm" title="Delete row">−</button>
            <div className="relative">
              <button type="button" onMouseDown={e => { e.preventDefault(); setShowColors(!showColors) }} className="w-5 h-5 flex items-center justify-center rounded text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all leading-none text-xs" title="Cell background">
                <FontAwesomeIcon icon={faPalette} className="w-2.5 h-2.5" />
              </button>
              {showColors && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex gap-1 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  {HIGHLIGHT_COLORS.map(c => (
                    <ColorBtn key={c.label} color={c.value} />
                  ))}
                </div>
              )}
            </div>
            <button type="button" onMouseDown={e => { e.preventDefault(); runCmd(() => editor.chain().focus().deleteTable().run()) }} className="w-5 h-5 flex items-center justify-center rounded bg-rose-500 text-white hover:bg-rose-600 transition-all font-bold leading-none text-xs shadow-sm" title="Delete table">×</button>
          </div>
          <div className="absolute z-50 flex flex-col items-center gap-1" style={{ top: tableRectRef.current.top + 4, left: Math.max(4, tableRectRef.current.left - 20) }}>
            <button type="button" onMouseDown={e => { e.preventDefault(); runCmd(() => editor.chain().focus().addColumnBefore().run()) }} className="w-5 h-5 flex items-center justify-center rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-all font-bold leading-none text-xs shadow-sm" title="Add column left">+</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); runCmd(() => editor.chain().focus().deleteColumn().run()) }} className="w-5 h-5 flex items-center justify-center rounded bg-rose-500 text-white hover:bg-rose-600 transition-all font-bold leading-none text-xs shadow-sm" title="Delete column">−</button>
          </div>
          <div className="absolute z-50 flex flex-col items-center gap-1" style={{ top: tableRectRef.current.top + 4, left: Math.max(tableRectRef.current.left + tableRectRef.current.width - 20, tableRectRef.current.left + 4) }}>
            <button type="button" onMouseDown={e => { e.preventDefault(); runCmd(() => editor.chain().focus().addColumnAfter().run()) }} className="w-5 h-5 flex items-center justify-center rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-all font-bold leading-none text-xs shadow-sm" title="Add column right">+</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); runCmd(() => editor.chain().focus().deleteColumn().run()) }} className="w-5 h-5 flex items-center justify-center rounded bg-rose-500 text-white hover:bg-rose-600 transition-all font-bold leading-none text-xs shadow-sm" title="Delete column">−</button>
          </div>
          <div className="absolute z-50 flex items-center gap-1" style={{ top: tableRectRef.current.top + tableRectRef.current.height + 6, left: tableRectRef.current.left }}>
            <button type="button" onMouseDown={e => { e.preventDefault(); runCmd(() => editor.chain().focus().addRowAfter().run()) }} className="w-5 h-5 flex items-center justify-center rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-all font-bold leading-none text-xs shadow-sm" title="Add row below">+</button>
            <button type="button" onMouseDown={e => { e.preventDefault(); runCmd(() => editor.chain().focus().deleteRow().run()) }} className="w-5 h-5 flex items-center justify-center rounded bg-rose-500 text-white hover:bg-rose-600 transition-all font-bold leading-none text-xs shadow-sm" title="Delete row">−</button>
          </div>
        </>
      )}
      <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
        <EditorContent editor={editor} className="flex-1 flex flex-col" />
      </div>
      <div className="sticky bottom-0 z-10">
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
          <div className="flex flex-nowrap gap-0.5 p-1.5 overflow-x-auto scrollbar-none" role="toolbar" aria-label="Text formatting">
        <Btn action={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} icon={faBold} label="Bold" />
        <Btn action={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} icon={faItalic} label="Italic" />
        <Btn action={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} icon={faUnderline} label="Underline" />
        <Btn action={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} icon={faStrikethrough} label="Strikethrough" />
        <Btn action={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} icon={faHeading} label="Heading 1" text="1" />
        <Btn action={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} icon={faHeading} label="Heading 2" text="2" />
        <Btn action={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} icon={faHeading} label="Heading 3" text="3" />
        <Divider />
        <Btn action={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} icon={faListUl} label="Bullet List" />
        <Btn action={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} icon={faListOl} label="Numbered List" />
        <Btn action={() => editor?.chain().focus().toggleTaskList().run()} active={editor?.isActive('taskList')} icon={faListCheck} label="Task List" />
        <Divider />
        <Btn action={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} icon={faQuoteLeft} label="Blockquote" />
        <Btn action={handleCodeBlock} active={editor?.isActive('codeBlock')} icon={faCode} label="Code Block" />
        <Btn action={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()} icon={faTable} label="Insert Table" />
        <Divider />
        <Btn action={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.onchange = e => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
              const reader = new FileReader()
              reader.onload = () => editor?.chain().focus().setImage({ src: reader.result as string }).run()
              reader.readAsDataURL(file)
            }
          }
          input.click()
        }} icon={faImage} label="Insert Image" />
        <Btn action={() => setShowAudioModal(true)} icon={faMicrophone} label="Record Audio" />
        <AudioRecorderModal open={showAudioModal} onClose={() => setShowAudioModal(false)} onInsert={blob => {
          const url = URL.createObjectURL(blob)
          editor?.chain().focus().insertContent(`<audio controls src="${url}"></audio>`).run()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        }} />
        <Divider />
        <Btn action={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' })} icon={faAlignLeft} label="Align Left" />
        <Btn action={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} icon={faAlignCenter} label="Align Center" />
        <Btn action={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })} icon={faAlignRight} label="Align Right" />
        <Btn action={() => editor?.chain().focus().setTextAlign('justify').run()} active={editor?.isActive({ textAlign: 'justify' })} icon={faAlignJustify} label="Align Justify" />
        <Divider />
        <Btn action={() => editor?.chain().focus().undo().run()} icon={faUndo} label="Undo" />
        <Btn action={() => editor?.chain().focus().redo().run()} icon={faRedo} label="Redo" />
        </div>
      </div>
      <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
        {(() => {
          const text = content.replace(/<[^>]*>/g, '')
          const words = text.trim() ? text.trim().split(/\s+/).length : 0
          return `${words} ${words === 1 ? 'word' : 'words'} · ${text.length} ${text.length === 1 ? 'char' : 'chars'}`
        })()}
      </div>
      </div>
    </div>
  )
}
