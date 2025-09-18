import { LanguageCode } from './types'

export interface TranslateOptions {
  source?: LanguageCode
  target: LanguageCode
}

export interface Translator {
  translate(text: string, opts: TranslateOptions): Promise<{ content: string; language: LanguageCode }>
}

// Local basic translator: identity + tiny phrasebook for demos
const PHRASEBOOK: Record<LanguageCode, Record<string, string>> = {
  en: {},
  es: { 'hello': 'hola', 'world': 'mundo', 'good': 'bueno', 'knowledge': 'conocimiento' },
  fr: { 'hello': 'bonjour', 'world': 'monde', 'good': 'bon', 'knowledge': 'connaissance' },
  de: { 'hello': 'hallo', 'world': 'welt', 'good': 'gut', 'knowledge': 'wissen' },
  it: { 'hello': 'ciao', 'world': 'mondo', 'good': 'buono', 'knowledge': 'conoscenza' },
  pt: { 'hello': 'olá', 'world': 'mundo', 'good': 'bom', 'knowledge': 'conhecimento' },
  nl: { 'hello': 'hallo', 'world': 'wereld', 'good': 'goed', 'knowledge': 'kennis' },
  sv: { 'hello': 'hej', 'world': 'värld', 'good': 'bra', 'knowledge': 'kunskap' },
  fi: { 'hello': 'hei', 'world': 'maailma', 'good': 'hyvä', 'knowledge': 'tieto' },
  no: { 'hello': 'hallo', 'world': 'verden', 'good': 'bra', 'knowledge': 'kunnskap' },
  da: { 'hello': 'hej', 'world': 'verden', 'good': 'god', 'knowledge': 'viden' },
}

export class LocalTranslator implements Translator {
  async translate(text: string, opts: TranslateOptions): Promise<{ content: string; language: LanguageCode }> {
    const source = opts.source ?? 'en'
    const target = opts.target
    if (source === target) return { content: text, language: target }
    const dict = PHRASEBOOK[target]
    const mapped = text
      .split(/(\W+)/)
      .map((tok) => {
        const lower = tok.toLowerCase()
        const t = dict[lower]
        if (!t) return tok
        return matchCase(tok, t)
      })
      .join('')
    return { content: mapped, language: target }
  }
}

function matchCase(source: string, word: string): string {
  if (source.toUpperCase() === source) return word.toUpperCase()
  if (source[0] === source[0]?.toUpperCase()) return word[0]?.toUpperCase() + word.slice(1)
  return word
}

