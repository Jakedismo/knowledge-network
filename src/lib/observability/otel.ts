/* Lightweight OTEL bootstrap for browser/node. Safe no-op if OTLP exporter not configured. */
export function recordCollabMetric(name: string, value: number, attributes?: Record<string, string | number | boolean>) {
  try {
    // Placeholder hook; wire to real metrics SDK in Phase 5
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(`[metric] ${name}=${value}`, attributes)
    }
  } catch {}
}

export function logStructured(event: string, data: Record<string, unknown>) {
  try {
    const payload = { ts: new Date().toISOString(), event, ...data }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload))
  } catch {}
}

