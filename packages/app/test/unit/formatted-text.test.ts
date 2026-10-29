import { describe, expect, it } from 'vitest'
import { parseFormattedText, parseInline } from '../../app/utils/formattedText'

describe('parseFormattedText', () => {
  it('turns short "Label:" lines, all-caps lines and # lines into headings', () => {
    const blocks = parseFormattedText('Culture:\nSome text.\n\nDAMASK ROW (TENT 4)\n## Secrets')
    expect(blocks.map(b => b.kind)).toEqual(['heading', 'paragraph', 'heading', 'heading'])
    expect(blocks[0]).toEqual({ kind: 'heading', parts: [{ text: 'Culture' }] })
    expect(blocks[3]).toEqual({ kind: 'heading', parts: [{ text: 'Secrets' }] })
  })

  it('gives "Label: value" lines a bold label', () => {
    expect(parseFormattedText('Leader: Evander')).toEqual([
      { kind: 'labeled', label: 'Leader', parts: [{ text: 'Evander' }] },
    ])
  })

  it('does not treat a sentence with a colon as a label', () => {
    const [b] = parseFormattedText('The truth is simple: she is the Spire.')
    expect(b!.kind).toBe('paragraph')
  })

  it('groups bullets and keeps paragraphs apart', () => {
    const blocks = parseFormattedText('Intro line\n- one\n▸ two\nAfter')
    expect(blocks.map(b => b.kind)).toEqual(['paragraph', 'bullets', 'paragraph'])
    expect(blocks[1]).toEqual({ kind: 'bullets', items: [[{ text: 'one' }], [{ text: 'two' }]] })
  })

  it('keeps line breaks inside a paragraph', () => {
    const [b] = parseFormattedText('first\nsecond')
    expect(b).toEqual({ kind: 'paragraph', lines: [[{ text: 'first' }], [{ text: 'second' }]] })
  })

  it('handles empty input', () => {
    expect(parseFormattedText(null)).toEqual([])
    expect(parseFormattedText('')).toEqual([])
  })
})

describe('parseInline', () => {
  it('splits **bold** runs', () => {
    expect(parseInline('a **b** c')).toEqual([{ text: 'a ' }, { text: 'b', bold: true }, { text: ' c' }])
  })
})
