export class Redis {
  constructor(_options?: Record<string, unknown> | string) {}

  async get(_key: string): Promise<string | null> {
    return null
  }

  async set(_key: string, _value: string, _mode?: string, _duration?: number): Promise<'OK'> {
    return 'OK'
  }

  async del(_key: string): Promise<number> {
    return 0
  }

  async expire(_key: string, _seconds: number): Promise<number> {
    return 1
  }

  async quit(): Promise<void> {}

  on(_event: string, _listener: (...args: any[]) => void): this {
    return this
  }
}

export default Redis
