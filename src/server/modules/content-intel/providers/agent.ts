import { executeAgent } from '@/server/modules/ai/execute'
import type { LanguageCode } from '../types'

export class AgentSummarizer {
  async summarize(content: string, opts: { maxSentences?: number; language?: LanguageCode } = {}): Promise<string> {
    const res = await executeAgent({
      instructions: 'Summarize the provided content in the given language and limit sentences.',
      input: { task: 'summarize', content, maxSentences: opts.maxSentences ?? 3, language: opts.language ?? 'en' },
    })
    return res.outputText ?? ''
  }
}

export class AgentTranslator {
  async translate(content: string, opts: { source?: LanguageCode; target: LanguageCode }): Promise<{ content: string; language: LanguageCode }> {
    const res = await executeAgent({
      instructions: 'Translate the content to the target language. Return only the translated text.',
      input: { task: 'translate', content, source: opts.source ?? 'en', target: opts.target },
    })
    return { content: res.outputText ?? content, language: opts.target }
  }
}

