/**
 * Compress a data-url image: down-scale to maxWidth, re-encode as JPEG.
 * Falls back to the original data url if anything goes wrong.
 */
export function compressDataUrl(
  dataUrl: string,
  opts: { maxWidth?: number; maxHeight?: number; quality?: number; mimeType?: string } = {}
): Promise<string> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.85, mimeType = 'image/jpeg' } = opts
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(dataUrl)
        // White background for JPEG (no alpha)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL(mimeType, quality))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/** Read a File as a compressed data url. */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('read fail'))
    reader.readAsDataURL(file)
  })
  return compressDataUrl(original)
}

/** Approximate byte size of a base64 data url. */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',')
  if (i < 0) return dataUrl.length
  const b64 = dataUrl.slice(i + 1)
  return Math.floor(b64.length * 3 / 4)
}
