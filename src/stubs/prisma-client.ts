export class PrismaClient {
  constructor(_options?: Record<string, unknown>) {}
  async $connect(): Promise<void> {}
  async $disconnect(): Promise<void> {}
  async $use(): Promise<void> {}
}

export default PrismaClient
