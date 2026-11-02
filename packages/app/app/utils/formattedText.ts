/**
 * Turns plain description text into simple blocks for display, so entries
 * written as plain text still read with headings, labels and bullets:
 *
 * - "# Title" / "## Title"            → heading
 * - "Culture:" (short line, ends ":") → heading
 * - "DAMASK ROW (TENT 4)" (all caps)  → heading
 * - "- item" / "• item" / "▸ item"    → bullet
 * - "Leader: Sylas"                   → bold label + text
 * - "**bold**" inside any line        → bold
 * - "{{npc:12}}" inside any line       → link to that entry (shown by name)
 * - blank line                        → new paragraph
 *
 * Text is never treated as HTML.
 */
export type InlinePart = { text: string, bold?: boolean, link?: { type: string, id: number } }

export type TextBlock
  = | { kind: 'heading', parts: InlinePart[] }
    | { kind: 'paragraph', lines: InlinePart[][] }
    | { kind: 'bullets', items: InlinePart[][] }
    | { kind: 'labeled', label: string, parts: InlinePart[] }

const BULLET = /^\s*(?:[-*•▸▪►–]|\d+[.)])\s+(.*)$/
const MD_HEADING = /^\s*#{1,6}\s+(.+?)\s*#*\s*$/
// Up to 3 words before the colon, so "The truth is simple: …" stays a sentence
const LABELED = /^([A-Z][^\s:.!?]*(?:\s+[^\s:.!?]+){0,2}):\s+(\S.*)$/

/** DM Hero's entry-link code, e.g. {{npc:12}} */
const LINK = /\{\{(\w+):(\d+)\}\}/g

function splitLinks(text: string, bold: boolean, out: InlinePart[]) {
  let last = 0
  for (const m of text.matchAll(LINK)) {
    if (m.index! > last) out.push(bold ? { text: text.slice(last, m.index), bold } : { text: text.slice(last, m.index) })
    const part: InlinePart = { text: '', link: { type: m[1]!.toLowerCase(), id: Number(m[2]) } }
    if (bold) part.bold = true
    out.push(part)
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push(bold ? { text: text.slice(last), bold } : { text: text.slice(last) })
}

export function parseInline(line: string): InlinePart[] {
  const parts: InlinePart[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    if (m.index > last) splitLinks(line.slice(last, m.index), false, parts)
    splitLinks(m[1]!, true, parts)
    last = m.index + m[0].length
  }
  if (last < line.length) splitLinks(line.slice(last), false, parts)
  return parts.length ? parts : [{ text: line }]
}

function isHeadingLine(line: string): string | null {
  const md = line.match(MD_HEADING)
  if (md) return md[1]!
  const t = line.trim()
  if (t.length < 2 || t.length > 60) return null
  // "Culture:" — short label on its own line
  if (t.endsWith(':') && !t.slice(0, -1).includes(':') && !/[.!?]/.test(t)) return t.slice(0, -1).trim()
  // "DAMASK ROW (TENT 4)" — shouted section titles
  const letters = t.replace(LINK, '').replace(/[^\p{L}]/gu, '')
  if (letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) return t
  return null
}

export function parseFormattedText(text: string | null | undefined): TextBlock[] {
  const blocks: TextBlock[] = []
  if (!text) return blocks
  let para: InlinePart[][] | null = null
  let list: InlinePart[][] | null = null
  const flush = () => {
    if (para?.length) blocks.push({ kind: 'paragraph', lines: para })
    if (list?.length) blocks.push({ kind: 'bullets', items: list })
    para = null
    list = null
  }

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flush()
      continue
    }
    const heading = isHeadingLine(line)
    if (heading) {
      flush()
      blocks.push({ kind: 'heading', parts: parseInline(heading) })
      continue
    }
    const bullet = line.match(BULLET)
    if (bullet) {
      if (para) {
        blocks.push({ kind: 'paragraph', lines: para })
        para = null
      }
      list ??= []
      list.push(parseInline(bullet[1]!))
      continue
    }
    const labeled = line.trim().match(LABELED)
    if (labeled) {
      flush()
      blocks.push({ kind: 'labeled', label: labeled[1]!.trim(), parts: parseInline(labeled[2]!) })
      continue
    }
    if (list) {
      blocks.push({ kind: 'bullets', items: list })
      list = null
    }
    para ??= []
    para.push(parseInline(line.trim()))
  }
  flush()
  return blocks
}
