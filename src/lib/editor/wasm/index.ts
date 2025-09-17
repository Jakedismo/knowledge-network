// Lazy WASM loader with JS fallback
// If the WASM package is not built/available, consumers can use RopeText (JS) directly.

export type CoreTextWasm = {
  new: () => any
  fromString: (s: string) => any
  lenChars: () => number
  insert: (pos: number, text: string) => void
  delete: (pos: number, len: number) => void
  slice: (start: number, end: number) => string
}

export async function loadCoreWasm(): Promise<CoreTextWasm | null> {
  try {
    // eslint-disable-next-line
    // @ts-ignore - runtime dynamic import
    const wasm = await import('../../../../packages/kn-editor-core/pkg/kn_editor_core.js')
    return wasm
  } catch (_e) {
    return null
  }
}
