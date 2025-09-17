import type { vi } from 'vitest'

declare global {
  var vi: typeof vi
}

declare module '*.worker.ts' {
  const url: string
  export default url
}

export {}
