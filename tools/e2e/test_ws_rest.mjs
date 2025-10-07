import WebSocket from 'ws'

const WS_URL = process.env.WS_URL
const REST_URL = process.env.REST_URL
const MESSAGE = process.env.MESSAGE || 'Hello from automated E2E test'
const KNOWLEDGE_BASE_ID = process.env.KB_ID || 'MOCK'

if (!WS_URL || !REST_URL) {
  console.error('Missing required env vars. Please set WS_URL and REST_URL.')
  process.exit(1)
}

if (typeof fetch !== 'function') {
  console.error(
    'Global fetch is not available in this Node version. Please use Node 18+ or set up a fetch polyfill.',
  )
  process.exit(1)
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  console.log(`[E2E] Connecting to WS: ${WS_URL}`)
  const ws = new WebSocket(WS_URL)

  let connectionId = null
  const received = []
  let resolved = false

  const wsReady = new Promise((resolve, reject) => {
    ws.on('open', () => resolve())
    ws.on('error', (err) => reject(err))
  })

  const wsMessages = new Promise((resolve) => {
    ws.on('message', (data) => {
      try {
        const msg = data.toString()
        received.push(msg)
        // Attempt to parse ack
        const parsed = JSON.parse(msg)
        const ackType = parsed?.type || parsed?.event
        if (!connectionId && ackType === 'connection-ack' && parsed?.connectionId) {
          connectionId = parsed.connectionId
          console.log(`[E2E] Received ack with connectionId: ${connectionId}`)
        }
      } catch (e) {
        // Keep raw message if not JSON
      }
    })
    ws.on('close', () => {
      if (!resolved) resolve()
    })
  })

  await wsReady

  // Send an initial message to trigger default route ack
  try {
    ws.send(JSON.stringify({ action: 'hello' }))
  } catch {}

  // Wait up to 5s for ack
  const ackTimeoutMs = 5000
  const start = Date.now()
  while (!connectionId && Date.now() - start < ackTimeoutMs) {
    await wait(100)
  }
  if (!connectionId) {
    console.error(
      '[E2E] Did not receive connection-ack within timeout. Received frames so far:',
      received,
    )
    try {
      ws.close()
    } catch {}
    process.exit(2)
  }

  const body = {
    prompt: MESSAGE,
    connectionId,
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
  }

  const chatUrl = REST_URL.endsWith('/') ? `${REST_URL}chat` : `${REST_URL}/chat`
  console.log(`[E2E] POST ${chatUrl}`)
  const resp = await fetch(chatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  console.log('[E2E] REST status:', resp.status)
  let respText = ''
  try {
    respText = await resp.text()
  } catch {}
  if (resp.status >= 400) {
    console.error('[E2E] REST error body:', respText)
    try {
      ws.close()
    } catch {}
    process.exit(3)
  }

  // Collect streaming messages for a short window
  console.log('[E2E] Awaiting streaming messages over WS for ~6s...')
  await wait(6000)
  try {
    ws.close()
  } catch {}
  // Give a tick for close
  await wait(200)

  resolved = true
  console.log('\n[E2E] Summary')
  console.log('  WS ack connectionId:', connectionId)
  console.log('  REST response status:', resp.status)
  if (respText) console.log('  REST response body:', respText)
  console.log('  WS received frames (count):', received.length)
  for (const [i, msg] of received.entries()) {
    console.log(`    [${i}] ${msg}`)
  }
}

main().catch((err) => {
  console.error('[E2E] Uncaught error:', err)
  process.exit(10)
})
