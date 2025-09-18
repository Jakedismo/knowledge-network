export type LanguageCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'nl'
  | 'sv'
  | 'fi'
  | 'no'
  | 'da'

export interface AnalyzeRequest {
  content: string
  title?: string
  workspaceId?: string
  maxSummarySentences?: number
  maxTags?: number
  languageHint?: LanguageCode
  targetLanguage?: LanguageCode
}

export interface SentenceScore {
  index: number
  score: number
  text: string
}

export interface KeywordScore {
  term: string
  score: number
}

export interface Entity {
  type: 'PERSON' | 'ORG' | 'PRODUCT' | 'PLACE' | 'DATE' | 'EMAIL' | 'URL' | 'OTHER'
  text: string
  start: number
  end: number
}

export interface ReadabilityMetrics {
  fleschReadingEase: number
  fleschKincaidGrade: number
  gunningFog: number
  smogIndex: number
  ari: number
  colemanLiau: number
  lix: number
  rix: number
  sentences: number
  words: number
  syllables: number
}

export interface QualityScore {
  score: number // 0..100
  signals: {
    lengthAdequacy: number // 0..100
    readability: number // 0..100
    repetitionPenalty: number // 0..100
    structure: number // 0..100
    languageConfidence: number // 0..100
  }
}

export interface SentimentResult {
  score: number // negative .. positive
  comparative: number // normalized by token count
  positive: string[]
  negative: string[]
}

export interface LanguageDetectResult {
  language: LanguageCode
  confidence: number // 0..1
}

export interface AnalyzeResult {
  summary: string
  keywords: KeywordScore[]
  tags: string[]
  entities: Entity[]
  concepts: string[]
  readability: ReadabilityMetrics
  quality: QualityScore
  sentiment: SentimentResult
  language: LanguageDetectResult
  translation?: {
    language: LanguageCode
    content: string
  }
}

