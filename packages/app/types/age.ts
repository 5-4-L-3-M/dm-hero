/**
 * "102" + "27" → "102 (human 27)". Long-lived races get a human-equivalent age
 * next to their real one; either can be missing.
 */
export function ageText(age: unknown, human: unknown, humanWord = 'human'): string {
  const a = age === null || age === undefined ? '' : String(age).trim()
  const h = human === null || human === undefined ? '' : String(human).trim()
  if (a && h) return `${a} (${humanWord} ${h})`
  if (a) return a
  return h ? `${humanWord} ${h}` : ''
}
