// URL sanitizers and helpers for embedded media

export function sanitizeYouTubeUrl(input: string): string | null {
  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') {
      // Extract video id
      let id = ''
      if (host === 'youtu.be') id = url.pathname.slice(1)
      else if (url.searchParams.get('v')) id = url.searchParams.get('v') || ''
      else if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2] || ''
      if (!/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null
      const params = new URLSearchParams()
      params.set('rel', '0')
      params.set('modestbranding', '1')
      params.set('iv_load_policy', '3')
      return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
    }
    return null
  } catch {
    return null
  }
}

export function sanitizeVimeoUrl(input: string): string | null {
  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean)[0]
      if (!/^[0-9]{6,}$/.test(id || '')) return null
      return `https://player.vimeo.com/video/${id}`
    }
    return null
  } catch {
    return null
  }
}

export function sanitizeTwitterUrl(input: string): string | null {
  // X/Twitter embedding prefers blockquote + script; for privacy and CSPs we
  // fallback to simple link preview area. Keep sanitizer strict.
  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'twitter.com' || host === 'x.com') {
      const parts = url.pathname.split('/').filter(Boolean)
      // /{user}/status/{id}
      if (parts.length >= 3 && parts[1] === 'status' && /^[0-9]+$/.test(parts[2])) {
        return `https://${host}/${parts[0]}/status/${parts[2]}`
      }
    }
    return null
  } catch {
    return null
  }
}

