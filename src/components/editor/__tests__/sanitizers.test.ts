import { describe, it, expect } from 'vitest'
import { sanitizeYouTubeUrl, sanitizeVimeoUrl, sanitizeTwitterUrl } from '@/lib/editor/sanitizers'

describe('sanitizers', () => {
  it('sanitizes YouTube URLs', () => {
    const safe = sanitizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(safe?.includes('youtube-nocookie.com/embed/')).toBe(true)
  })

  it('rejects invalid YouTube URLs', () => {
    expect(sanitizeYouTubeUrl('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('sanitizes Vimeo URLs', () => {
    const safe = sanitizeVimeoUrl('https://vimeo.com/1234567')
    expect(safe?.startsWith('https://player.vimeo.com/video/')).toBe(true)
  })

  it('sanitizes Twitter URLs', () => {
    const safe = sanitizeTwitterUrl('https://twitter.com/user/status/1234567890')
    expect(safe?.includes('/status/')).toBe(true)
  })
})

