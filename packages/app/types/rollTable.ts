// Roll tables: "d20 rumors at the docks", "random street encounter", "loot in the crypt"

export interface RollTableRow {
  id?: number
  min: number
  max: number
  result: string
}

export interface RollTableTag {
  kind: 'entity' | 'session'
  ref_id: number
  name: string
  /** Entity type (Quest, Location, NPC …) or 'Session' */
  type: string
}

export interface RollTable {
  id: number
  name: string
  category: string | null
  description: string | null
  /** The die rolled ("d20", "2d6"); null = sized to the rows */
  dice: string | null
  /** Column headings after the roll column (empty = just "Result") */
  columns: string[]
  rows: RollTableRow[]
  tags: RollTableTag[]
  updated_at: string
}

/** The die that covers the rows: the table's own, or 1..highest */
export function tableDice(t: Pick<RollTable, 'dice' | 'rows'>): string {
  if (t.dice && parseDice(t.dice)) return t.dice
  const top = Math.max(1, ...t.rows.map(r => r.max))
  return `d${top}`
}

export function parseDice(dice: string): { count: number, sides: number, bonus: number } | null {
  const m = dice.replace(/\s+/g, '').toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/)
  if (!m) return null
  const count = Number(m[1] || 1)
  const sides = Number(m[2])
  if (count < 1 || count > 20 || sides < 2 || sides > 1000) return null
  return { count, sides, bonus: Number(m[3] || 0) }
}

export function rollDice(dice: string, random: () => number = Math.random): { total: number, rolls: number[] } {
  const d = parseDice(dice) ?? { count: 1, sides: 20, bonus: 0 }
  const rolls = Array.from({ length: d.count }, () => 1 + Math.floor(random() * d.sides))
  return { total: rolls.reduce((a, b) => a + b, 0) + d.bonus, rolls }
}

/** A row's cells: "Round 1 | CON Save DC 10" → two columns */
export function cellsOf(result: string): string[] {
  return result.split(/\s*\|\s*/).map(c => c.trim())
}

/** Headings from a pasted header line ("| d8 | Round | Save |", "Roll | Result | Effect"), without the roll column */
export function parseHeader(text: string): string[] | null {
  const first = text.split(/\r?\n/).map(l => l.trim()).find(Boolean)
  if (!first || !first.includes('|')) return null
  const cells = first.replace(/^\|\s*/, '').replace(/\s*\|$/, '').split(/\s*\|\s*/)
  if (cells.length < 2 || !/^(\d*d\d+|roll|#|no\.?|number)$/i.test(cells[0]!)) return null
  const rest = cells.slice(1).filter(Boolean)
  return rest.length ? rest : null
}

/** "Round | Save" typed by hand → clean headings */
export function cleanColumns(v: unknown): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split('|') : []
  return list.map(x => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 8)
}

export function rowFor(rows: RollTableRow[], n: number): RollTableRow | null {
  return rows.find(r => n >= r.min && n <= r.max) ?? null
}

/**
 * Pasted text → rows. Understands "1 | text", "1-4: text", "01–05 text", "11. text",
 * Markdown tables ("| 1–2 | text |"), or plain lines (numbered 1, 2, 3 …).
 */
export function parseRows(text: string): RollTableRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .filter(l => !/^\|?\s*:?-{2,}/.test(l)) // markdown separator rows
  const numbered: RollTableRow[] = []
  const plain: string[] = []
  for (const raw of lines) {
    const line = raw.replace(/^\|\s*/, '').replace(/\s*\|$/, '')
    const m = line.match(/^(\d{1,4})\s*(?:[-–—]|to)\s*(\d{1,4})\s*(?:[|:.)\t]|\s)\s*(.+)$/i)
      ?? line.match(/^(\d{1,4})()\s*(?:[|:.)\t]|\s)\s*(.+)$/)
    if (m) {
      const min = Number(m[1])
      const max = m[2] ? Number(m[2]) : min
      const result = m[3]!.replace(/\s*\|\s*/g, ' | ').trim()
      if (result && !/^(d\d+|roll|result|#)$/i.test(result)) numbered.push({ min: Math.min(min, max), max: Math.max(min, max), result })
    }
    else if (!/^(\d*d\d+|roll|result)\b|^#/i.test(line)) {
      plain.push(line)
    }
  }
  if (numbered.length) return numbered
  return plain.map((result, i) => ({ min: i + 1, max: i + 1, result }))
}
