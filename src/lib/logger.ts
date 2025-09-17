type LogArgs = [message?: any, ...optionalParams: any[]]

export const logger = {
  info: (...args: LogArgs) => console.info(...args),
  warn: (...args: LogArgs) => console.warn(...args),
  error: (...args: LogArgs) => console.error(...args),
  debug: (...args: LogArgs) => console.debug(...args),
}

