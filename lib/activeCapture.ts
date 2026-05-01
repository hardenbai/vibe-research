// Module-level registry for the currently focused draft source card's capture handler.
// The global Cmd+Shift+S shortcut calls this when fired.

type CaptureHandler = (imageBase64: string, url: string) => void

let _handler: CaptureHandler | null = null

export function setActiveCaptureHandler(fn: CaptureHandler | null) {
  _handler = fn
}

export function callActiveCaptureHandler(imageBase64: string, url: string) {
  _handler?.(imageBase64, url)
}

export function hasActiveCaptureHandler() {
  return _handler !== null
}
