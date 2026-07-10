import { Node } from '@tiptap/core'

export const AudioExtension = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: 'controls' },
    }
  },

  parseHTML() {
    return [{ tag: 'audio[controls]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['audio', { controls: 'controls', src: HTMLAttributes.src }]
  },
})
