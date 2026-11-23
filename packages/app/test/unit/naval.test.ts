import { describe, expect, it } from 'vitest'
import { SHIP_PRESETS, normalizeShip, ramTable, repairTime, resolveMoves, rollDice, shipCondition, shipFromPreset } from '../../types/ship'

describe('naval movement', () => {
  const big = { size: 3 }
  const small = { size: 1 }

  it('ram vs flank: the flanker is rammed, the rammer gets advantage', () => {
    const r = resolveMoves({ move: 'flank', ...small }, { move: 'ram', ...big })
    expect(r.a.takesRam).toEqual({ dice: '8d12', braceDc: 16 })
    expect(r.a.weapons).toBe('disadvantage')
    expect(r.b.weapons).toBe('advantage')
    expect(r.b.takesRam).toBeNull()
    expect(r.boarding).toBe(true)
  })

  it('ram vs withdraw: the ram misses and the withdrawer gets a perfect flank', () => {
    const r = resolveMoves({ move: 'ram', ...big }, { move: 'withdraw', ...small })
    expect(r.a.takesRam).toBeNull()
    expect(r.a.broadsidesMiss).toBe(true)
    expect(r.a.onlyMounts).toEqual(['stern'])
    expect(r.b.perfectFlank).toBe(true)
    expect(r.b.mayFlee).toBe(true)
  })

  it('withdraw vs flank: the flanker gets the perfect flank at the bow', () => {
    const r = resolveMoves({ move: 'withdraw', ...small }, { move: 'flank', ...small })
    expect(r.b.perfectFlank).toBe(true)
    expect(r.a.onlyMounts).toEqual(['bow'])
  })

  it('both ram: each takes damage by the other ship\'s size', () => {
    const r = resolveMoves({ move: 'ram', ...small }, { move: 'ram', ...big })
    expect(r.a.takesRam?.dice).toBe('8d12')
    expect(r.b.takesRam?.dice).toBe('4d12')
  })

  it('both flank: competing maneuver checks; both withdraw: nothing happens', () => {
    expect(resolveMoves({ move: 'flank', ...small }, { move: 'flank', ...big }).contest).toBe(true)
    const w = resolveMoves({ move: 'withdraw', ...small }, { move: 'withdraw', ...big })
    expect(w.a.weapons).toBe('normal')
    expect(w.b.weapons).toBe('normal')
  })

  it('a ship that can\'t maneuver lets the other choose', () => {
    const r = resolveMoves({ move: 'none', ...small }, { move: 'ram', ...big })
    expect(r.kind).toBe('disabled')
    expect(r.b.mayFlee).toBe(true)
  })

  it('ram table caps at +3 and floors at 0', () => {
    expect(ramTable(-2)).toEqual({ dice: '4d12', braceDc: 12 })
    expect(ramTable(5)).toEqual({ dice: '10d12', braceDc: 18 })
  })
})

describe('ship state', () => {
  it('presets fill parts and hull', () => {
    const prowler = SHIP_PRESETS.find(p => p.key === 'prowler')!
    const d = shipFromPreset(prowler)
    expect(d.hull).toBe(400)
    expect(d.masts).toEqual([100, 100])
  })

  it('half the masts down halves speed; all masts down disables', () => {
    const d = shipFromPreset(SHIP_PRESETS.find(p => p.key === 'bull')!)
    d.masts = [0, 0, 100, 100]
    expect(shipCondition(d).halfMast).toBe(true)
    expect(shipCondition(d).speed).toBe(17)
    d.masts = [0, 0, 0, 0]
    expect(shipCondition(d).disabled).toBe(true)
    expect(shipCondition(d).speed).toBe(0)
  })

  it('normalizes partial data', () => {
    const d = normalizeShip({ hull: 10 } as never)
    expect(d.hull).toBe(10)
    expect(Array.isArray(d.weapons)).toBe(true)
  })
})

describe('repairs and dice', () => {
  it('looks up repair times', () => {
    expect(repairTime(12, true, false).seconds).toBe(3600)
    expect(repairTime(12, false, true)).toEqual({ seconds: 30, rounds: 5 })
    expect(repairTime(0, true, false).seconds).toBe(-1)
    expect(repairTime(31, true, true).seconds).toBe(0)
  })

  it('rolls several dice groups and flat bonuses', () => {
    const max = () => 0.999999
    expect(rollDice('20d6 + 20d6', max).total).toBe(240)
    expect(rollDice('1d4+3', max).total).toBe(7)
    expect(rollDice('4d12 + 6d6', () => 0).total).toBe(10)
  })
})

describe('card text', async () => {
  const { cardText } = await import('../../app/utils/formattedText')
  it('strips markdown and shows entry links by name', () => {
    const md = '**Keeper · Convergence Memorial Hall**\nSenior keeper who leads the rites.\n\n- serves {{npc:12}}\n## Notes\n*quiet* [map](http://x)'
    expect(cardText(md, (t, id) => `${t}#${id}`)).toBe('Keeper · Convergence Memorial Hall Senior keeper who leads the rites. serves npc#12 Notes quiet map')
  })
  it('keeps ordinary asterisks and snake_case', () => {
    expect(cardText('5 * 3 = 15 and my_var')).toBe('5 * 3 = 15 and my_var')
  })
})
