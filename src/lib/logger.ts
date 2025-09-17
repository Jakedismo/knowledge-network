/* eslint-disable no-console */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDev = () => process.env.NODE_ENV !== 'production'

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev()) console.debug(...args)
  },
  info: (...args: unknown[]) => {
    if (isDev()) console.info(...args)
  },
  warn: (...args: unknown[]) => {
    if (isDev()) console.warn(...args)
  },
  error: (...args: unknown[]) => {
    // Always capture errors in dev; in prod this can be wired to a sink
    console.error(...args)
  },
}

