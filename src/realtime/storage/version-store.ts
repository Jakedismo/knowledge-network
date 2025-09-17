/*
 * VersionStore abstraction for autosave + history.
 * Default implementation writes snapshots to workspace under data/collab.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export type VersionMeta = {
  id: string // ISO timestamp
  size: number
  createdAt: string
  docClock?: number
}

export interface VersionStore {
  save(roomId: string, state: Uint8Array, meta?: Partial<VersionMeta>): Promise<VersionMeta>
  loadLatest(roomId: string): Promise<Uint8Array | null>
  list(roomId: string, limit?: number): Promise<VersionMeta[]>
  load(roomId: string, id: string): Promise<{ meta: VersionMeta; data: Uint8Array } | null>
}

export class FileVersionStore implements VersionStore {
  private readonly root: string

  constructor(rootDir = 'data/collab') {
    this.root = rootDir
  }

  async save(roomId: string, state: Uint8Array, meta?: Partial<VersionMeta>): Promise<VersionMeta> {
    const dir = join(this.root, sanitize(roomId))
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const id = meta?.id ?? new Date().toISOString()
    const bin = join(dir, `${id}.bin`)
    const info = { id, size: state.byteLength, createdAt: id, docClock: meta?.docClock }
    writeFileSync(bin, state)
    writeFileSync(join(dir, `${id}.json`), JSON.stringify(info, null, 2))
    return info
  }

  async loadLatest(roomId: string): Promise<Uint8Array | null> {
    const dir = join(this.root, sanitize(roomId))
    if (!existsSync(dir)) return null
    const files = readdirSync(dir).filter((f) => f.endsWith('.bin'))
    if (files.length === 0) return null
    files.sort()
    const last = files[files.length - 1]
    return new Uint8Array(readFileSync(join(dir, last)))
  }

  async list(roomId: string, limit = 20): Promise<VersionMeta[]> {
    const dir = join(this.root, sanitize(roomId))
    if (!existsSync(dir)) return []
    const metas = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => join(dir, f))
      .map((p) => ({ path: p, st: statSync(p) }))
      .sort((a, b) => b.st.mtimeMs - a.st.mtimeMs)
      .slice(0, limit)
      .map((p) => JSON.parse(readFileSync(p.path, 'utf8')) as VersionMeta)
    return metas
  }

  async load(roomId: string, id: string): Promise<{ meta: VersionMeta; data: Uint8Array } | null> {
    const dir = join(this.root, sanitize(roomId))
    const bin = join(dir, `${id}.bin`)
    const meta = join(dir, `${id}.json`)
    if (!existsSync(bin) || !existsSync(meta)) return null
    return {
      meta: JSON.parse(readFileSync(meta, 'utf8')) as VersionMeta,
      data: new Uint8Array(readFileSync(bin)),
    }
  }
}

function sanitize(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '_')
}
