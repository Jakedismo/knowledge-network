import { aiConfig, invokeAgent } from '@/server/modules/ai'

export default async function fetchExecute(body: any): Promise<string | undefined> {
  if (!aiConfig.apiKey) throw new Error('AI not configured')
  const res = await invokeAgent({
    model: aiConfig.defaultModel,
    instructions: body?.instructions,
    input: body?.input,
    userId: 'fact-check',
    stream: false,
  })
  return (res as any)?.outputText as string | undefined
}

