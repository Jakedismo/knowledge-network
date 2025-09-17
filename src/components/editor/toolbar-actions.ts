export type Selection = {
  start: number
  end: number
}

export function surround(
  text: string,
  sel: Selection,
  left: string,
  right: string = left
): { next: string; newSel: Selection } {
  const before = text.slice(0, sel.start)
  const selected = text.slice(sel.start, sel.end)
  const after = text.slice(sel.end)
  const next = `${before}${left}${selected}${right}${after}`
  const newStart = sel.start + left.length
  const newEnd = newStart + selected.length
  return { next, newSel: { start: newStart, end: newEnd } }
}

export function insertHeading(
  text: string,
  sel: Selection,
  level: 1 | 2 | 3 | 4 | 5 | 6
): { next: string; newSel: Selection } {
  // Insert at line start
  const lineStart = text.lastIndexOf('\n', sel.start - 1) + 1
  const hash = '#'.repeat(level) + ' '
  const before = text.slice(0, lineStart)
  const after = text.slice(lineStart)
  const next = `${before}${hash}${after}`
  const delta = hash.length
  const newStart = sel.start + delta
  const newEnd = sel.end + delta
  return { next, newSel: { start: newStart, end: newEnd } }
}

export function toggleList(
  text: string,
  sel: Selection,
  ordered: boolean
): { next: string; newSel: Selection } {
  const startLine = text.lastIndexOf('\n', sel.start - 1) + 1
  const endLineIdx = text.indexOf('\n', sel.end)
  const endLine = endLineIdx === -1 ? text.length : endLineIdx
  const lines = text.slice(startLine, endLine).split('\n')
  const prefixer = (i: number) => (ordered ? `${i + 1}. ` : '- ')
  const updated = lines.map((l, i) => {
    // prevent double prefixing
    const already = ordered ? /^\s*\d+\.\s/.test(l) : /^\s*[-*+]\s/.test(l)
    return already ? l : prefixer(i) + l
  })
  const next = text.slice(0, startLine) + updated.join('\n') + text.slice(endLine)
  // crude selection adjustment
  const deltaPerLine = ordered ? 3 : 2
  const linesCount = lines.length
  const delta = deltaPerLine * linesCount
  return { next, newSel: { start: sel.start + deltaPerLine, end: sel.end + delta } }
}

export function insertLink(
  text: string,
  sel: Selection,
  url: string,
  label?: string
): { next: string; newSel: Selection } {
  const shown = label ?? (text.slice(sel.start, sel.end) || 'link')
  const md = `[${shown}](${url})`
  const before = text.slice(0, sel.start)
  const after = text.slice(sel.end)
  const next = `${before}${md}${after}`
  const start = before.length + 1
  const end = start + shown.length
  return { next, newSel: { start, end } }
}

export function insertImage(
  text: string,
  sel: Selection,
  url: string,
  alt = ''
): { next: string; newSel: Selection } {
  const md = `![${alt}](${url})`
  const before = text.slice(0, sel.start)
  const after = text.slice(sel.end)
  const next = `${before}${md}${after}`
  const pos = before.length + md.length
  return { next, newSel: { start: pos, end: pos } }
}

export function insertCodeBlock(
  text: string,
  sel: Selection,
  language = ''
): { next: string; newSel: Selection } {
  const md = `\n\n\`\`\`${language}\n${text.slice(sel.start, sel.end) || ''}\n\`\`\`\n`
  const before = text.slice(0, sel.end)
  const after = text.slice(sel.end)
  const next = `${before}${md}${after}`
  const cursor = (before + md).length
  return { next, newSel: { start: cursor, end: cursor } }
}
