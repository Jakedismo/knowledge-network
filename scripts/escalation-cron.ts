/*
  Triggers workflow escalations by POSTing the internal API endpoint.
  Configure CRON to run: bun --bun scripts/escalation-cron.ts
  Env:
    BASE_URL=http://localhost:3005 (or your deployed URL)
    AUTH_TOKEN=... (optional, if JWT required)
    WORKSPACE_ID=... (for ACL guard when using header context)
*/
const base = process.env.BASE_URL ?? 'http://localhost:3005'
const url = `${base}/api/reviews/escalate`

async function main() {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const token = process.env.AUTH_TOKEN
  const ws = process.env.WORKSPACE_ID
  const user = process.env.CRON_USER_ID ?? 'system-cron'
  if (token) headers.authorization = `Bearer ${token}`
  headers['x-user-id'] = user
  if (ws) headers['x-workspace-id'] = ws
  const res = await fetch(url, { method: 'POST', headers })
  if (!res.ok) {
    console.error('Escalation cron failed', res.status, await res.text())
    process.exit(1)
  }
  console.log('Escalations:', await res.json())
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

