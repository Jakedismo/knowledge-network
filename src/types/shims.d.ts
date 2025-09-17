// Minimal shims so type-checking passes without local services
declare module 'yjs' {
  const y: any
  export = y
}
declare module 'y-protocols/awareness' {
  export const Awareness: any
}
declare module '@elastic/elasticsearch' {
  const Client: any
  export { Client }
  export type ClientOptions = any
}
declare module '@elastic/elasticsearch/lib/api/types' {
  export type BulkResponseItem = any
  export type BulkOperationContainer = any
}
declare module 'ioredis' {
  const Redis: any
  export = Redis
}
declare module 'marked' {
  export const marked: any
}
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string)
    window: any
  }
}
declare module 'storybook/test' {
  export const expect: any
  export const within: any
  export const userEvent: any
}
declare module '*.css' {
  const content: any
  export default content
}
declare module '@prisma/client' {
  export class PrismaClient {}
}
// Bun type shim used in realtime server
declare const Bun: any

