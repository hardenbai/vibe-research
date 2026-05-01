export async function captureScreenshot(): Promise<{ imageBase64: string; url: string } | null> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })

    return new Promise(resolve => {
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true

      video.addEventListener('loadedmetadata', () => {
        video.play()
        setTimeout(() => {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          canvas.getContext('2d')?.drawImage(video, 0, 0)
          stream.getTracks().forEach(t => t.stop())

          const imageBase64 = canvas.toDataURL('image/png')

          navigator.clipboard.readText()
            .then(text => resolve({ imageBase64, url: /^https?:\/\//.test(text) ? text : '' }))
            .catch(() => resolve({ imageBase64, url: '' }))
        }, 300)
      })

      video.addEventListener('error', () => {
        stream.getTracks().forEach(t => t.stop())
        resolve(null)
      })
    })
  } catch {
    return null
  }
}
