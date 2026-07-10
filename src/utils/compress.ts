import LZString from 'lz-string'

export function compressHtml(html: string): string {
  return LZString.compressToUTF16(html)
}

export function decompressHtml(compressed: string): string {
  return LZString.decompressFromUTF16(compressed) || ''
}

export function tryDecompress(data: string, wasCompressed: boolean): string {
  if (!wasCompressed) return data
  const result = LZString.decompressFromUTF16(data)
  return result || data
}
