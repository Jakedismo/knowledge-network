import { AnalyzeRequest, AnalyzeResult, LanguageCode } from './types'
import { detectLanguage } from './tokenize'
import { summarize } from './summarize'
import { extractKeywords, suggestTags } from './keywords'
import { extractEntities } from './entities'
import { computeReadability } from './readability'
import { computeQualitySignals } from './quality'
import { LocalTranslator } from './translate'

export class ContentIntelligenceService {
  private translator = new LocalTranslator()

  async analyze(req: AnalyzeRequest): Promise<AnalyzeResult> {
    const content = (req.content || '').trim()
    const { language, confidence } = detectLanguage(content, req.languageHint)

    const sum = summarize(content, { maxSentences: req.maxSummarySentences, language })
    const keywords = extractKeywords(content, { language, max: req.maxTags ?? 10, boostTitle: req.title ?? null })
    const tags = suggestTags(content, { language, max: req.maxTags ?? 10, title: req.title ?? '' })
    const entities = extractEntities(content)
    const readability = computeReadability(content)
    const quality = computeQualitySignals(content, readability, confidence)
    const sentiment = (await import('./sentiment')).sentiment(content)

    let translation: AnalyzeResult['translation']
    if (req.targetLanguage && req.targetLanguage !== language) {
      const t = await this.translator.translate(content, { source: language, target: req.targetLanguage })
      translation = { language: t.language, content: t.content }
    }

    // Concepts: simple selection of high-score keywords + named entities (OTHER)
    const concepts = [
      ...keywords.slice(0, 5).map((k) => k.term),
      ...entities.filter((e) => e.type === 'OTHER').slice(0, 5).map((e) => e.text)
    ]

    return {
      summary: sum.summary,
      keywords,
      tags,
      entities,
      concepts: dedupe(concepts),
      readability,
      quality,
      sentiment,
      language: { language, confidence },
      translation,
    }
  }
}

function dedupe<T>(arr: T[]): T[] {
  const set = new Set<T>()
  const out: T[] = []
  for (const v of arr) if (!set.has(v)) { set.add(v); out.push(v) }
  return out
}

export const contentIntelligenceService = new ContentIntelligenceService()

