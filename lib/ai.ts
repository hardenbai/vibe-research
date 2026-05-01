/**
 * Streaming AI client supporting Anthropic and OpenAI-compatible APIs.
 * Yields text deltas as the server emits them.
 */

interface StreamArgs {
  providerId: string
  apiKey: string
  modelId: string
  baseUrl?: string
  system: string
  userPrompt: string
  signal?: AbortSignal
  onDelta: (chunk: string) => void
}

async function* sseLines(res: Response) {
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (line) yield line
    }
  }
  const tail = buf.trim()
  if (tail) yield tail
}

async function callAnthropicStream(a: StreamArgs) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: a.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': a.apiKey,
      'anthropic-version': '2023-06-01',
      // CORS: enable browser access
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: a.modelId,
      max_tokens: 2048,
      stream: true,
      system: a.system,
      messages: [{ role: 'user', content: a.userPrompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Anthropic API ${res.status}`)
  }
  for await (const line of sseLines(res)) {
    if (!line.startsWith('data:')) continue
    const json = line.slice(5).trim()
    if (!json) continue
    try {
      const evt = JSON.parse(json)
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
        a.onDelta(evt.delta.text)
      }
    } catch { /* skip malformed */ }
  }
}

async function callOpenAICompatStream(a: StreamArgs) {
  const url = a.baseUrl ? `${a.baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    signal: a.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${a.apiKey}`,
    },
    body: JSON.stringify({
      model: a.modelId,
      max_tokens: 2048,
      stream: true,
      messages: [
        { role: 'system', content: a.system },
        { role: 'user', content: a.userPrompt },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API ${res.status}`)
  }
  for await (const line of sseLines(res)) {
    if (!line.startsWith('data:')) continue
    const json = line.slice(5).trim()
    if (!json || json === '[DONE]') continue
    try {
      const evt = JSON.parse(json)
      const delta = evt.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta) a.onDelta(delta)
    } catch { /* skip malformed */ }
  }
}

export async function streamAI(a: StreamArgs): Promise<void> {
  if (a.providerId === 'anthropic') return callAnthropicStream(a)
  return callOpenAICompatStream(a)
}
