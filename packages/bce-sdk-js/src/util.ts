import { type BinaryLike, createHmac, type KeyObject } from 'node:crypto'

const kEscapedMap: Record<string, string> = {
  '!': '%21',
  "'": '%27',
  '(': '%28',
  ')': '%29',
  '*': '%2A',
}

const KEscapedRE = /[!'\(\)\*]/g

export function normalizeURL(input: string, encodingSlash?: boolean): string {
  const content = encodeURIComponent(input).replace(KEscapedRE, ($1) => kEscapedMap[$1])
  return encodingSlash === false ? content.replace(/%2F/gi, '/') : content
}

export function sha256(data: BinaryLike, key: BinaryLike | KeyObject) {
  return createHmac('sha256', key).update(data).digest('hex')
}

export const safeJSON = (text: string) => {
  try {
    return JSON.parse(text)
  } catch (err) {
    return undefined
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
