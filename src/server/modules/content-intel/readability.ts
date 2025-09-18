import { ReadabilityMetrics } from './types'
import { splitSentences, tokenize, countTextSyllables } from './tokenize'

export function computeReadability(text: string): ReadabilityMetrics {
  const sentences = splitSentences(text)
  const words = tokenize(text, 'en') // metrics primarily defined for English; acceptable fallback
  const syllables = countTextSyllables(words)
  const S = Math.max(1, sentences.length)
  const W = Math.max(1, words.length)
  const Sy = Math.max(1, syllables)

  const wordsPerSentence = W / S
  const syllablesPerWord = Sy / W

  const fleschReadingEase = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord
  const fleschKincaidGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59
  const gunningFog = 0.4 * (wordsPerSentence + 100 * complexWords(words) / W)
  const smogIndex = 1.0430 * Math.sqrt(complexWords(words) * (30 / S)) + 3.1291
  const ari = 4.71 * (characters(text) / W) + 0.5 * wordsPerSentence - 21.43
  const colemanLiau = 0.0588 * (letters(text) * (100 / W)) - 0.296 * (S * (100 / W)) - 15.8
  const lix = (W / S) + (100 * longWords(words) / W)
  const rix = longWords(words) / S

  return {
    fleschReadingEase,
    fleschKincaidGrade,
    gunningFog,
    smogIndex,
    ari,
    colemanLiau,
    lix,
    rix,
    sentences: S,
    words: W,
    syllables: Sy,
  }
}

function letters(text: string): number {
  const m = text.match(/[A-Za-z]/g)
  return m ? m.length : 0
}

function characters(text: string): number {
  const m = text.replace(/\s/g, '').match(/./g)
  return m ? m.length : 0
}

function longWords(words: string[]): number { return words.filter((w) => w.length >= 7).length }

function complexWords(words: string[]): number {
  // Approximate complex word as >= 3 syllables
  return words.filter((w) => syllables(w) >= 3).length
}

function syllables(word: string): number {
  // Simplified; mirrors tokenize count for consistency
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  const vow = w.match(/[aeiouy]{1,2}/g)
  let count = vow ? vow.length : 0
  if (w.endsWith('e')) count = Math.max(1, count - 1)
  return Math.max(1, count)
}

