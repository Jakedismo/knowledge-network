/* Basic tokenization, sentence splitting, stopwords, and syllable counting */
import { LanguageCode } from './types'

const STOPWORDS: Record<LanguageCode, Set<string>> = {
  en: new Set('a,an,the,and,or,if,then,else,when,while,for,of,to,in,on,at,by,from,with,about,as,into,like,through,after,over,between,out,against,during,without,before,under,around,among,is,are,was,were,be,been,being,have,has,had,do,does,did,can,could,should,would,may,might,will,shall,this,that,these,those,it,its,he,she,they,them,we,us,you,your,i,me,my,our,ours,their,his,her'.split(',')),
  es: new Set('el,la,los,las,un,una,unos,unas,y,o,si,entonces,cuando,mientras,para,de,a,en,sobre,por,desde,con,acerca,como,hacia,tras,después,entre,contra,durante,sin,antes,bajo,alrededor,entre,es,son,fue,fueron,ser,haber,ha,han,hacer,hace,hacen,puede,podría,debería,sería,puede,podría,esto,eso,estos,esas,lo,su,él,ella,ellos,nosotros,ustedes,tú,yo,mi,nuestro,sus'.split(',')),
  fr: new Set('le,la,les,un,une,des,et,ou,si,alors,lorsque,pour,de,à,dans,sur,par,depuis,avec,au,sans,avant,sous,autour,entre,est,sont,était,étaient,être,avoir,a,ont,faire,fait,font,peut,pourrait,devrait,serait,ce,cet,cette,ces,il,elle,ils,nous,vous,je,moi,mon,notre,leurs'.split(',')),
  de: new Set('der,die,das,ein,eine,und,oder,wenn,dann,während,für,von,zu,in,auf,bei,durch,mit,über,nach,vor,unter,zwischen,ohne,bevor,ist,sind,war,waren,sein,haben,hat,haben,tun,tut,taten,kann,könnte,sollte,würde,dies,das,diese,jener,er,sie,wir,ihr,ich,mich,mein,unser,ihr'.split(',')),
  it: new Set('il,lo,la,i,gli,le,un,una,uno,e,o,se,allora,quando,mentre,per,di,a,in,su,da,con,tra,dopo,senza,prima,sotto,intorno,fra,è,sono,era,erano,essere,avere,ha,hanno,fa,fanno,può,potrebbe,dovrebbe,sarebbe,questo,quello,questi,quelle,lui,lei,noi,voi,io,me,mio,nostro,loro'.split(',')),
  pt: new Set('o,a,os,as,um,uma,uns,umas,e,ou,se,então,quando,enquanto,para,de,do,da,em,sobre,por,desde,com,acerca,como,após,entre,contra,durante,sem,antes,sob,ao redor,entre,é,são,foi,foram,ser,ter,tem,têm,fazer,faz,fazem,pode,poderia,deveria,seria,isto,isso,estes,aqueles,ele,ela,nós,vocês,eu,meu,nosso,delas'.split(',')),
  nl: new Set('de,het,een,en,of,als,dan,terwijl,voor,van,naar,in,op,bij,door,met,over,na,voor,onder,tussen,zonder,voordat,rond,onder,dit,dat,deze,diegene,hij,zij,wij,jullie,ik,mijn,onze'.split(',')),
  sv: new Set('en,ett,och,eller,om,när,medan,för,av,till,i,på,vid,från,med,om,genom,efter,över,mellan,ut,emot,utan,innan,under,kring,bland,är,var,varit,ha,har,hade,göra,kan,kunde,borde,skulle,det,den,dessa,han,hon,vi,ni,jag,min,vår,deras'.split(',')),
  fi: new Set('ja,tai,jos,sitten,kun,kunnes,että,sekä,kun,kunka,kunnes,että,kun,kunnes,että,mutta,vaan,kuitenkin,vaikka,että,jos,kun,kunnes,missä,millä,mitä,kuka,kumpi,koska,niin,kuin,kun,että,on,oli,ovat,olla,minä,sinä,hän,me,te,he,se,ne,tämä,tuo,nämä,nuo'.split(',')),
  no: new Set('en,ei,et,og,eller,hvis,så,når,mens,for,av,til,i,på,ved,gjennom,etter,over,mellom,ut,imot,uten,før,under,rundt,blant,er,var,har,ha,gjøre,kan,kunne,bør,skulle,det,den,disse,han,hun,vi,dere,jeg,min,vår,deres'.split(',')),
  da: new Set('en,et,og,eller,hvis,så,når,medens,for,af,til,i,på,ved,genem,efter,over,mellem,ud,imod,uden,før,under,omkring,blandt,er,var,har,have,gøre,kan,kunne,bør,skulle,det,den,disse,han,hun,vi,I,jeg,min,vor,deres'.split(',')),
}

export function detectLanguage(text: string, hint: LanguageCode | undefined): { language: LanguageCode; confidence: number } {
  if (hint) return { language: hint, confidence: 0.9 }
  const sample = text.toLowerCase().slice(0, 2000)
  const LANGS: LanguageCode[] = ['en','es','fr','de','it','pt','nl','sv','fi','no','da']
  let bestLang: LanguageCode = 'en'
  let bestHits = -1
  for (const lang of LANGS) {
    const sw = STOPWORDS[lang]
    let hits = 0
    for (const w of sw) {
      if (!w) continue
      const re = new RegExp(`\\b${escapeRegex(w)}\\b`, 'g')
      const m = sample.match(re)
      if (m) hits += m.length
    }
    if (hits > bestHits) { bestHits = hits; bestLang = lang }
  }
  const total = sample.split(/\s+/).length || 1
  const confidence = Math.min(1, bestHits / Math.max(10, total / 5))
  return { language: bestLang, confidence }
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-ZÅÄÖÉÈÂÊÎÔÛÄÖÜÁÉÍÓÚÑÆØÅ])/u)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function tokenize(text: string, lang: LanguageCode = 'en'): string[] {
  const stop = STOPWORDS[lang] || STOPWORDS.en
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stop.has(t))
}

export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  // Heuristic English syllable counter; acceptable approximation for metrics
  const vow = w.match(/[aeiouy]{1,2}/g)
  let count = vow ? vow.length : 0
  if (w.endsWith('e')) count = Math.max(1, count - 1)
  return Math.max(1, count)
}

export function countTextSyllables(words: string[]): number {
  let total = 0
  for (const w of words) total += countSyllables(w)
  return total
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
