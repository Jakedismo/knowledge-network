export type ClientOptions = Record<string, unknown>

export class Client {
  indices = {
    async exists(_params?: Record<string, unknown>) {
      return { body: false }
    },
    async create(_params?: Record<string, unknown>) {
      return { body: { acknowledged: true } }
    },
    async putMapping(_params?: Record<string, unknown>) {
      return { body: { acknowledged: true } }
    },
    async updateAliases(_params?: Record<string, unknown>) {
      return { body: { acknowledged: true } }
    },
    async refresh(_params?: Record<string, unknown>) {
      return { body: {} }
    },
  }

  constructor(_options?: ClientOptions) {}

  async ping(): Promise<{ body: boolean }> {
    return { body: true }
  }

  async info(): Promise<{ body: Record<string, unknown> }> {
    return { body: {} }
  }

  async search<T = any>(_params?: Record<string, unknown>): Promise<{ hits: { total: number; hits: T[] }; took: number; fromCache?: boolean }> {
    return { hits: { total: 0, hits: [] }, took: 0, fromCache: false }
  }

  async index(_params?: Record<string, unknown>): Promise<{ result: string }> {
    return { result: 'noop' }
  }

  async bulk(_params?: Record<string, unknown>): Promise<{ items: unknown[] }> {
    return { items: [] }
  }

  async delete(_params?: Record<string, unknown>): Promise<{ result: string }> {
    return { result: 'noop' }
  }
}

export default Client
