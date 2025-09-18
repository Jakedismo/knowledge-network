// Lightweight wrapper for OpenAI Realtime via @openai/agents with graceful fallbacks
// This module is intentionally permissive with 'any' to avoid tight SDK coupling.

export type RealtimeEvents = {
  onPartial?: (text: string) => void
  onFinal?: (text: string) => void
  onError?: (err: unknown) => void
  onAny?: (name: string, data: unknown) => void
}

export class RealtimeClient {
  private session: any | null = null
  private agent: any | null = null
  private stream: MediaStream | null = null
  private connected = false
  private events: RealtimeEvents
  private audioEl: HTMLAudioElement | null = null
  private Ctors: { RealtimeSession?: any; RealtimeAgent?: any; OpenAIRealtimeWebRTC?: any } = {}
  private ws: WebSocket | null = null
  private audioQueue: { itemId: string; audio: ArrayBuffer }[] = []
  private playbackContext: AudioContext | null = null

  constructor(events: RealtimeEvents = {}) {
    this.events = events
  }

  setHandlers(events: RealtimeEvents) {
    this.events = events
  }

  async connect(): Promise<{ model?: string } | void> {
    if (this.connected) return
    const res = await fetch('/api/ai/realtime/session', { method: 'POST' })
    if (!res.ok) throw new Error(await res.text())
    const { clientSecret, model, useBeta } = await res.json()

    console.log('[RealtimeClient] Session info:', { model, useBeta, keyPrefix: clientSecret?.substring(0, 10) })
    console.log('[RealtimeClient] useBeta type:', typeof useBeta, 'value:', useBeta)

    // For GA API, we'll use direct WebSocket connection
    // Make sure to check both false and "false" string
    if (!useBeta || useBeta === false || useBeta === "false") {
      console.log('[RealtimeClient] Using direct WebSocket for GA API')
      return this.connectDirectWebSocket(clientSecret, model)
    }

    console.log('[RealtimeClient] Using SDK for beta API')

    // Try to import the realtime package
    let mod: any = null
    try {
      mod = await import('@openai/agents/realtime')
    } catch {
      try {
        mod = await import('@openai/agents-realtime')
      } catch {
        try {
          mod = await import('@openai/agents')
        } catch {}
      }
    }

    if (!mod) throw new Error('Realtime SDK not available')

    // Check for the new API structure (RealtimeAgent + RealtimeSession)
    const RealtimeAgent = (mod as any).RealtimeAgent
    const RealtimeSession = (mod as any).RealtimeSession
    const OpenAIRealtimeWebSocket = (mod as any).OpenAIRealtimeWebSocket

    if (RealtimeAgent && RealtimeSession) {
      // New API structure from @openai/agents/realtime
      console.log('[RealtimeClient] Using new API with RealtimeAgent and RealtimeSession')
      console.log('[RealtimeClient] Model:', model)

      this.agent = new RealtimeAgent({
        name: 'Assistant',
        instructions: 'You are a helpful assistant.'
      })

      // Check if we have OpenAIRealtimeWebSocket for explicit WebSocket transport
      let sessionConfig: any = {
        model: model || 'gpt-realtime'
      }

      if (OpenAIRealtimeWebSocket) {
        // Use explicit WebSocket transport with beta configuration
        console.log('[RealtimeClient] OpenAIRealtimeWebSocket constructor found')

        try {
          // Create transport without config to avoid issues
          const transport = new OpenAIRealtimeWebSocket()
          sessionConfig.transport = transport
          console.log('[RealtimeClient] Created OpenAIRealtimeWebSocket transport')
        } catch (err) {
          console.error('[RealtimeClient] Failed to create OpenAIRealtimeWebSocket:', err)
          // Fall back to string transport type
          sessionConfig.transport = 'websocket'
        }
      } else {
        // Fallback to specifying transport type
        sessionConfig.transport = 'websocket'
        console.log('[RealtimeClient] Using websocket transport mode')
      }

      // Add provider-specific configuration for beta API
      if (useBeta) {
        sessionConfig.providerData = {
          beta: true,
          headers: {
            'OpenAI-Beta': 'realtime=v1'
          }
        }
      }

      this.session = new RealtimeSession(this.agent, sessionConfig)

      console.log('[RealtimeClient] Session created')
      console.log('[RealtimeClient] Model:', model)

      // Subscribe to events
      if (this.session?.on) {
        // Handle connection events
        this.session.on('connect', () => {
          console.log('[RealtimeClient] Session connected event')
          this.connected = true
        })

        this.session.on('disconnect', () => {
          console.log('[RealtimeClient] Session disconnected event')
          this.connected = false
        })

        // Handle audio events
        this.session.on('audio', (event: any) => {
          this.events.onAny?.('audio', event)
          // Handle audio playback if needed
        })

        // Handle transcript events (for speech-to-text)
        this.session.on('transcript', (event: any) => {
          this.events.onAny?.('transcript', event)
          const text = typeof event === 'string' ? event : event?.text || event?.transcript
          const isFinal = typeof event === 'object' ? event?.final : true
          if (text) {
            if (isFinal) {
              this.events.onFinal?.(String(text))
            } else {
              this.events.onPartial?.(String(text))
            }
          }
        })

        // Handle message events (for text responses)
        this.session.on('message', (event: any) => {
          console.log('[RealtimeClient] Message event:', event)
          this.events.onAny?.('message', event)
          const content = typeof event === 'string' ? event : event?.content || event?.text || event?.message
          if (content) {
            this.events.onFinal?.(String(content))
          }
        })

        // Handle response events
        this.session.on('response', (event: any) => {
          console.log('[RealtimeClient] Response event:', event)
          this.events.onAny?.('response', event)
        })

        // Handle errors
        this.session.on('error', (e: unknown) => {
          console.error('[RealtimeClient] Error event:', e)
          this.events.onAny?.('error', e)
          this.events.onError?.(e)
        })
      }

      // Connect with the ephemeral key using WebSocket transport
      if (this.session?.connect) {
        try {
          // The SDK expects 'apiKey' parameter for ephemeral keys
          console.log('[RealtimeClient] Connecting with ephemeral key via WebSocket')
          console.log('[RealtimeClient] Using beta API:', useBeta)

          // Configure connection based on API version
          const connectOptions: any = {
            apiKey: clientSecret  // This should be the ephemeral key from the server
          }

          // If using beta API, we might need to specify the URL
          if (useBeta) {
            // For beta API, use the beta WebSocket endpoint
            connectOptions.url = 'wss://api.openai.com/v1/realtime'
            connectOptions.model = model || 'gpt-realtime'
          }

          await this.session.connect(connectOptions)
          console.log('[RealtimeClient] Connected successfully')
          this.connected = true
        } catch (err: any) {
          console.error('[RealtimeClient] Connection failed:', err?.message)

          // Log the error to understand what's happening
          console.log('[RealtimeClient] Connection error details:', {
            message: err?.message,
            stack: err?.stack,
            name: err?.name
          })

          // If connection fails, try with direct API key (development only)
          if (err?.message?.includes('ephemeral') || err?.message?.includes('subprotocol')) {
            console.log('[RealtimeClient] Retrying with direct API key (dev mode)')
            try {
              // Try without any special options
              await this.session.connect(clientSecret)
              console.log('[RealtimeClient] Connected with direct token')
              this.connected = true
            } catch (err2: any) {
              console.error('[RealtimeClient] Direct token also failed:', err2?.message)

              // Last attempt: try with different format
              try {
                await this.session.connect({
                  apiKey: clientSecret,
                  useInsecureApiKey: true
                })
                console.log('[RealtimeClient] Connected with useInsecureApiKey')
                this.connected = true
              } catch (err3: any) {
                console.error('[RealtimeClient] All connection attempts failed')
                throw err3
              }
            }
          } else {
            throw err
          }
        }
      }
    } else {
      // No compatible SDK found
      throw new Error('OpenAI Realtime SDK not found. Please ensure @openai/agents or @openai/agents-realtime is installed.')
    }

    return { model }
  }

  async startMicrophone() {
    if (!this.connected) await this.connect()

    // Request microphone with specific settings for OpenAI
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 24000,  // OpenAI expects 24kHz
        channelCount: 1      // Mono audio
      }
    })

    try {
      // If using direct WebSocket connection, we need to stream audio manually
      if (this.ws && !this.session) {
        console.log('[RealtimeClient] Setting up direct audio streaming via WebSocket')

        // Create an AudioContext to process the audio
        const audioContext = new AudioContext({ sampleRate: 24000 })
        const source = audioContext.createMediaStreamSource(this.stream)

        // Create a ScriptProcessorNode to capture audio chunks
        // Buffer size of 2048 samples = ~85ms at 24kHz
        const processor = audioContext.createScriptProcessor(2048, 1, 1)

        processor.onaudioprocess = (e) => {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

          const inputData = e.inputBuffer.getChannelData(0)

          // Convert Float32Array to PCM16 (Int16Array)
          const pcm16 = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            // Convert from float (-1.0 to 1.0) to int16 (-32768 to 32767)
            const s = Math.max(-1, Math.min(1, inputData[i]))
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }

          // Convert to base64 for transmission
          const buffer = pcm16.buffer
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))

          // Send audio data to the server
          const audioMessage = {
            type: 'input_audio_buffer.append',
            audio: base64
          }

          this.ws.send(JSON.stringify(audioMessage))
        }

        // Connect the nodes
        source.connect(processor)
        processor.connect(audioContext.destination)

        // Store the processor so we can disconnect it later
        (this as any).audioProcessor = processor
        (this as any).audioContext = audioContext

        console.log('[RealtimeClient] Audio streaming setup complete')
        return
      }

      // SDK-based audio handling (for beta API)
      // Preferred per SDK: configure the session with a WebRTC transport layer
      if (this.Ctors.OpenAIRealtimeWebRTC) {
        const transport = new (this.Ctors.OpenAIRealtimeWebRTC)({
          mediaStream: this.stream,
          audioElement: this.audioEl || undefined,
        })
        if (typeof this.session?.configure === 'function') {
          await this.session.configure({ transport })
          this.events.onAny?.('transport', 'configure(OpenAIRealtimeWebRTC)')
          return
        }
        if (typeof this.session?.setTransport === 'function') {
          this.session.setTransport(transport)
          this.events.onAny?.('transport', 'setTransport(OpenAIRealtimeWebRTC)')
          return
        }
        // As a last resort, try assigning a transport property
        ;(this.session as any).transport = transport
        this.events.onAny?.('transport', 'assign(OpenAIRealtimeWebRTC)')
        return
      }
      // Fallbacks for older builds: attach tracks or full stream
      if (typeof this.session?.addAudioTrack === 'function') {
        for (const track of this.stream.getAudioTracks()) this.session.addAudioTrack(track)
        this.events.onAny?.('transport', 'addAudioTrack')
      } else if (typeof this.session?.attachMediaStream === 'function') {
        await this.session.attachMediaStream(this.stream)
        this.events.onAny?.('transport', 'attachMediaStream')
      }
    } catch (err) {
      this.events.onError?.(err)
    }
  }

  async stopMicrophone() {
    try {
      this.stream?.getTracks().forEach((t) => t.stop())
    } catch {}
    this.stream = null

    // Clean up audio processor if using direct WebSocket
    if ((this as any).audioProcessor) {
      try {
        (this as any).audioProcessor.disconnect()
        (this as any).audioProcessor = null
      } catch {}
    }
    if ((this as any).audioContext) {
      try {
        (this as any).audioContext.close()
        (this as any).audioContext = null
      } catch {}
    }

    // Send input_audio_buffer.commit to finalize the audio input
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))

      // Trigger response generation after committing audio
      this.ws.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio']
        }
      }))
    }

    // Signal end of input if supported (for SDK)
    try { await this.session?.finalize?.() } catch {}
  }

  async disconnect() {
    // Close WebSocket if using direct connection
    if (this.ws) {
      try {
        this.ws.close()
      } catch (err) {
        console.error('[RealtimeClient] Error closing WebSocket:', err)
      }
      this.ws = null
    }

    // Disconnect SDK session if exists
    try { await this.session?.disconnect?.() } catch {}
    this.session = null
    this.connected = false
  }

  async sendText(text: string) {
    if (!this.connected) await this.connect()

    // If using direct WebSocket, send via WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[RealtimeClient] Sending via WebSocket:', text)
      return this.sendTextViaWebSocket(text)
    }

    const s = this.session
    if (!s) throw new Error('Session not initialized')

    // According to the docs, use sendMessage for text
    if (s.sendMessage) {
      console.log('[RealtimeClient] Sending message:', text)
      return s.sendMessage(text)
    }

    // Fallback to other methods
    if (s.sendText) {
      console.log('[RealtimeClient] Sending via sendText:', text)
      return s.sendText(text)
    }

    if (s.send) {
      console.log('[RealtimeClient] Sending via send:', text)
      return s.send({ type: 'input_text', text })
    }

    if (s.prompt) {
      console.log('[RealtimeClient] Sending via prompt:', text)
      return s.prompt(text)
    }

    throw new Error('Realtime session does not support text input')
  }

  attachAudio(el: HTMLAudioElement) {
    this.audioEl = el
    try {
      if (this.session?.attachAudioElement) {
        this.session.attachAudioElement(el)
      } else if (this.session?.transport?.attachAudioElement) {
        this.session.transport.attachAudioElement(el)
      }
    } catch (err) {
      // ignore
    }
  }

  private async connectDirectWebSocket(apiKey: string, model: string): Promise<{ model?: string } | void> {
    console.log('[RealtimeClient] Using direct WebSocket connection for GA API')

    // Type check the API key
    if (typeof apiKey !== 'string') {
      console.error('[RealtimeClient] Invalid API key type:', typeof apiKey, apiKey)
      throw new Error('API key must be a string')
    }

    // For browser WebSocket, we need to pass the API key in a different way
    // OpenAI supports passing it in the URL or as a subprotocol
    const wsUrl = `wss://api.openai.com/v1/realtime?model=${model || 'gpt-realtime'}`

    console.log('[RealtimeClient] Connecting to:', wsUrl)
    console.log('[RealtimeClient] API key type:', typeof apiKey)
    console.log('[RealtimeClient] API key length:', apiKey?.length)
    console.log('[RealtimeClient] API key prefix:', apiKey?.substring(0, 10))

    try {
      // For OpenAI Realtime GA API, we need to use the proper Authorization header format
      // WebSockets in browsers don't support custom headers directly, so we use subprotocols
      console.log('[RealtimeClient] Configuring WebSocket authentication')

      // OpenAI expects the API key to be passed as a subprotocol in this specific format
      const subprotocols: string[] = []

      // Add the realtime protocol first
      subprotocols.push('realtime')

      // Then add the API key in the correct format
      if (apiKey && typeof apiKey === 'string' && apiKey.length > 0) {
        // Format: "openai-insecure-api-key.<your-api-key>"
        const authProtocol = `openai-insecure-api-key.${apiKey}`
        subprotocols.push(authProtocol)
        console.log('[RealtimeClient] Using OpenAI insecure API key subprotocol')
      }

      // For beta API compatibility (though we're using GA)
      // Some versions might still expect this
      subprotocols.push('openai-beta.realtime-v1')

      console.log('[RealtimeClient] Subprotocols configured:', subprotocols.map(s =>
        s.startsWith('openai-insecure') ? 'openai-insecure-api-key.<hidden>' : s
      ))

      try {
        // Create WebSocket with proper subprotocols
        console.log('[RealtimeClient] Creating WebSocket with subprotocols')
        this.ws = new WebSocket(wsUrl, subprotocols)
        console.log('[RealtimeClient] WebSocket created successfully')
      } catch (subprotocolErr: any) {
        console.error('[RealtimeClient] Subprotocol creation failed:', subprotocolErr?.message)

        // Fallback: Try adding the API key as URL parameter
        console.log('[RealtimeClient] Falling back to URL parameter auth')

        try {
          // Append the API key as a query parameter
          const authUrl = `${wsUrl}&authorization=Bearer%20${encodeURIComponent(apiKey)}`
          console.log('[RealtimeClient] Attempting WebSocket with auth in URL')

          this.ws = new WebSocket(authUrl)
          console.log('[RealtimeClient] WebSocket created with URL auth')
        } catch (urlErr: any) {
          console.error('[RealtimeClient] URL auth also failed:', urlErr?.message)

          // Last resort: Try without any auth (will likely fail but worth trying)
          console.log('[RealtimeClient] Trying without auth (may fail)')
          this.ws = new WebSocket(wsUrl)
        }
      }
    } catch (err: any) {
      console.error('[RealtimeClient] Failed to create WebSocket with subprotocols')
      console.error('[RealtimeClient] Error name:', err?.name)
      console.error('[RealtimeClient] Error message:', err?.message)
      console.error('[RealtimeClient] Error stack:', err?.stack)
      console.error('[RealtimeClient] Full error:', err)

      // Fallback: try with auth in headers (won't work in browser but worth trying)
      try {
        console.log('[RealtimeClient] Trying without subprotocols')
        this.ws = new WebSocket(wsUrl)
        console.log('[RealtimeClient] Basic WebSocket created successfully')
      } catch (err2: any) {
        console.error('[RealtimeClient] Failed to create basic WebSocket')
        console.error('[RealtimeClient] Error2 name:', err2?.name)
        console.error('[RealtimeClient] Error2 message:', err2?.message)
        throw err2
      }
    }

    return new Promise((resolve, reject) => {
      if (!this.ws) return reject(new Error('WebSocket not initialized'))

      this.ws.onopen = () => {
        console.log('[RealtimeClient] WebSocket connected')
        this.connected = true

        // Send initial session configuration
        // For GA API, the format might be slightly different
        const sessionConfig = {
          type: 'session.update',
          session: {
            instructions: 'You are a helpful assistant.',
            voice: 'verse',
            modalities: ['text', 'audio'],
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            tools: [],
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 'inf'
          }
        }

        console.log('[RealtimeClient] Sending session configuration:', JSON.stringify(sessionConfig, null, 2))
        this.ws?.send(JSON.stringify(sessionConfig))

        console.log('[RealtimeClient] Session configuration sent')

        // Don't resolve immediately - wait for session.created confirmation
        // resolve({ model })
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[RealtimeClient] WebSocket message:', data.type)

          // Handle different message types
          switch (data.type) {
            case 'session.created':
              console.log('[RealtimeClient] Session created:', data.session)
              // Now we can resolve the connection promise
              resolve({ model })
              break

            case 'response.text.delta':
              this.events.onPartial?.(data.delta || '')
              break

            case 'response.text.done':
              this.events.onFinal?.(data.text || '')
              break

            case 'response.content_part.delta':
              // Handle content part deltas (new format)
              if (data.part?.type === 'text' && data.part?.text) {
                this.events.onPartial?.(data.part.text)
              }
              break

            case 'response.content_part.done':
              // Handle content part completion
              if (data.part?.type === 'text' && data.part?.text) {
                this.events.onFinal?.(data.part.text)
              }
              break

            case 'response.audio.transcript.delta':
              this.events.onPartial?.(data.delta || '')
              break

            case 'response.audio.transcript.done':
              this.events.onFinal?.(data.transcript || '')
              break

            case 'response.audio.delta':
              // Handle incoming audio chunks
              if (data.delta && this.audioEl) {
                this.playAudioChunk(data.delta, data.item_id)
              }
              break

            case 'response.audio.done':
              // Audio response completed
              console.log('[RealtimeClient] Audio response completed')
              break

            case 'response.done':
              // Response completed
              console.log('[RealtimeClient] Response completed')
              break

            case 'conversation.item.input_audio_transcription.completed':
              // User's speech was transcribed
              console.log('[RealtimeClient] User transcript:', data.transcript)
              this.events.onAny?.('user_transcript', data.transcript)
              break

            case 'input_audio_buffer.speech_started':
              console.log('[RealtimeClient] Speech started')
              this.events.onAny?.('speech_started', null)
              break

            case 'input_audio_buffer.speech_stopped':
              console.log('[RealtimeClient] Speech stopped')
              this.events.onAny?.('speech_stopped', null)
              break

            case 'error':
              console.error('[RealtimeClient] Error:', data.error)
              this.events.onError?.(data.error)
              break
          }

          this.events.onAny?.(data.type, data)
        } catch (err) {
          console.error('[RealtimeClient] Error parsing WebSocket message:', err)
        }
      }

      this.ws.onerror = (error) => {
        console.error('[RealtimeClient] WebSocket error event:', error)
        console.error('[RealtimeClient] Error type:', error?.type)
        console.error('[RealtimeClient] Full error object:', error)

        this.events.onError?.(error)

        // Don't reject on error if we're already connected
        if (!this.connected) {
          reject(new Error(`WebSocket connection failed: ${error}`))
        }
      }

      this.ws.onclose = (event) => {
        console.log('[RealtimeClient] WebSocket closed')
        console.log('[RealtimeClient] Close code:', event.code)
        console.log('[RealtimeClient] Close reason:', event.reason)
        console.log('[RealtimeClient] Was clean?:', event.wasClean)

        this.connected = false

        // Provide more specific error messages based on close codes
        if (event.code === 1002) {
          console.error('[RealtimeClient] Protocol error - likely authentication issue')
        } else if (event.code === 1006) {
          console.error('[RealtimeClient] Abnormal closure - connection lost')
        } else if (event.code === 1008) {
          console.error('[RealtimeClient] Policy violation - check API key and permissions')
        }
      }
    })
  }

  async sendTextViaWebSocket(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    // Send conversation item with correct format
    const messageItem = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'text',
          text: text
        }]
      }
    }

    console.log('[RealtimeClient] Sending message:', messageItem)
    this.ws.send(JSON.stringify(messageItem))

    // Trigger response generation
    const responseCreate = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    }

    console.log('[RealtimeClient] Triggering response')
    this.ws.send(JSON.stringify(responseCreate))
  }

  private playAudioChunk(base64Audio: string, itemId: string) {
    try {
      // Initialize AudioContext if needed
      if (!this.playbackContext) {
        this.playbackContext = new AudioContext({ sampleRate: 24000 })
      }

      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Convert PCM16 to Float32 for Web Audio API
      const pcm16 = new Int16Array(bytes.buffer)
      const float32 = new Float32Array(pcm16.length)
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0 // Convert to -1.0 to 1.0 range
      }

      // Create an audio buffer
      const audioBuffer = this.playbackContext.createBuffer(1, float32.length, 24000)
      audioBuffer.copyToChannel(float32, 0)

      // Create a buffer source and play it
      const source = this.playbackContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.playbackContext.destination)
      source.start()

      console.log('[RealtimeClient] Playing audio chunk for item:', itemId)
    } catch (err) {
      console.error('[RealtimeClient] Error playing audio:', err)
    }
  }
}
