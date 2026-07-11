import { registerPlugin } from '@capacitor/core'

export interface SaveToDownloadsPlugin {
  save(options: { data: string; filename: string }): Promise<{ uri: string }>
}

const SaveToDownloads = registerPlugin<SaveToDownloadsPlugin>('SaveToDownloads', {
  web: () => ({
    save: async ({ data, filename }) => {
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return { uri: url }
    },
  }),
})

export default SaveToDownloads
