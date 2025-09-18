import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { aiConfig } from '@/server/modules/ai'
import { requireAIAccess } from '@/server/modules/ai/policy'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const guard = await requireAIAccess(req, { permission: 'ai:invoke' })
  if (guard instanceof Response) return guard
  if (!aiConfig.apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  // Create an ephemeral Realtime session client secret for the browser
  const model = process.env.REALTIME_MODEL ?? 'gpt-realtime'
  const useBetaAPI = process.env.REALTIME_USE_BETA === 'true'

  // For GA API (non-beta), try to create an ephemeral token
  if (!useBetaAPI) {
    console.log('[Realtime Session] Using GA API, attempting to create ephemeral token')

    try {
      // Try GA endpoint for ephemeral token
      const base = aiConfig.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1'
      const endpoint = `${base}/realtime/sessions`  // Try same endpoint without beta header

      const headers = {
        'Authorization': `Bearer ${aiConfig.apiKey}`,
        'Content-Type': 'application/json'
        // No beta header for GA
      }

      const body = {
        model
      }

      console.log('[Realtime Session] Trying GA session creation')

      const rt = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (rt.ok) {
        const data = await rt.json()
        const ephemeralKey = data?.client_secret?.value || data?.client_secret || data?.ephemeral_key || data?.key
        if (ephemeralKey) {
          console.log('[Realtime Session] GA ephemeral token created successfully')
          return NextResponse.json({
            clientSecret: ephemeralKey,
            model,
            useBeta: false
          })
        }
      }

      // If GA endpoint doesn't work, fall back to returning API key
      console.log('[Realtime Session] GA endpoint failed, returning API key for direct WebSocket')
    } catch (err) {
      console.error('[Realtime Session] GA session creation error:', err)
    }

    // Fallback: return API key directly
    return NextResponse.json({
      clientSecret: aiConfig.apiKey,
      model,
      useBeta: false
    })
  }

  // For beta API, create an ephemeral session
  try {
    const base = aiConfig.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1'
    const endpoint = `${base}/realtime/sessions`
    const headers = {
      'Authorization': `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'realtime=v1'
    }

    const body = {
      model,
      voice: process.env.REALTIME_VOICE ?? 'verse',
      modalities: ['text', 'audio']
    }

    console.log('[Realtime Session] Creating beta session:', { endpoint, model })

    const rt = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!rt.ok) {
      const text = await rt.text().catch(() => '')
      console.error('[Realtime Session] Failed to create session:', rt.status, text)
      throw new Error(`${rt.status} ${text}`)
    }
    const data = await rt.json()
    console.log('[Realtime Session] Response structure:', Object.keys(data))
    console.log('[Realtime Session] Full response:', JSON.stringify(data, null, 2))

    // Different API versions have different response formats
    let ephemeralKey = null

    // The response shows client_secret.value for beta API
    if (data?.client_secret?.value) {
      ephemeralKey = data.client_secret.value
      console.log('[Realtime Session] Found ephemeral key in client_secret.value')
    } else if (data?.client_secret) {
      ephemeralKey = data.client_secret
      console.log('[Realtime Session] Found ephemeral key in client_secret')
    } else {
      console.error('[Realtime Session] No ephemeral key found in response')
    }

    console.log('[Realtime Session] Ephemeral key found:', !!ephemeralKey)
    console.log('[Realtime Session] Key prefix:', ephemeralKey?.substring(0, 10))
    console.log('[Realtime Session] Key expires at:', data?.client_secret?.expires_at)
    console.log('[Realtime Session] Model:', model)
    console.log('[Realtime Session] Using Beta API:', useBetaAPI)

    return NextResponse.json({ clientSecret: ephemeralKey, model, useBeta: useBetaAPI })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create realtime session', details: { message: err?.message } }, { status: 500 })
  }
}
