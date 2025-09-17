/// <reference lib="webworker" />

type TokenizeRequest = {
  type: 'tokenize'
  requestId: number
  version: number
  blocks: { id: string; text: string; gap: string }[]
}

type TokenizeResponse = {
  type: 'index'
  requestId: number
  version: number
  tokens: Record<string, { blockId: string; positions: number[] }[]>
}

const wordRegex = /[\p{L}\p{N}][\p{L}\p{N}_-]*/gu

self.onmessage = (event: MessageEvent<TokenizeRequest>) => {
  const data = event.data
  if (!data || data.type !== 'tokenize') return
  const tokens: Record<string, { blockId: string; positions: number[] }[]> = Object.create(null)

  for (const block of data.blocks) {
    const positionsByToken = new Map<string, number[]>()
    tokenizeBlock(block.text, positionsByToken)
    const gapLen = block.gap.length
    if (gapLen > 0) {
      tokenizeBlock(block.gap, positionsByToken, block.text.length)
    }
    for (const [token, positions] of positionsByToken.entries()) {
      if (!tokens[token]) tokens[token] = []
      tokens[token].push({ blockId: block.id, positions })
    }
  }

  const response: TokenizeResponse = {
    type: 'index',
    requestId: data.requestId,
    version: data.version,
    tokens,
  }
  ;(self as unknown as Worker).postMessage(response)
}

function tokenizeBlock(text: string, map: Map<string, number[]>, base = 0) {
  wordRegex.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = wordRegex.exec(text))) {
    const token = match[0].toLowerCase()
    const pos = base + (match.index ?? 0)
    const list = map.get(token) ?? []
    list.push(pos)
    map.set(token, list)
  }
}

export {}

