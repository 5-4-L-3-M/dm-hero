// Coins and prices.
//
// Every amount is kept in the campaign's BASE unit: the currency whose
// exchange_rate is 1 (copper by default). A purse is a count of coins per
// currency code, e.g. { PP: 0, GP: 12, SP: 5, CP: 3 }.

export interface Denomination {
  code: string
  /** Worth of one coin in base units (CP = 1, SP = 10, GP = 100, PP = 1000) */
  rate: number
  isDefault?: boolean
}

export type Purse = Record<string, number>

export const DEFAULT_DENOMINATIONS: Denomination[] = [
  { code: 'PP', rate: 1000 },
  { code: 'GP', rate: 100, isDefault: true },
  { code: 'SP', rate: 10 },
  { code: 'CP', rate: 1 },
]

/** Valid denominations, most valuable first. */
export function sortDenominations(denoms: Denomination[]): Denomination[] {
  return denoms.filter(d => Number.isFinite(d.rate) && d.rate > 0).sort((a, b) => b.rate - a.rate)
}

/** Whole, non-negative coin counts for every denomination. */
export function cleanPurse(raw: unknown, denoms: Denomination[]): Purse {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const purse: Purse = {}
  for (const d of denoms) {
    const n = Math.floor(Number(source[d.code] ?? 0))
    purse[d.code] = Number.isFinite(n) && n > 0 ? n : 0
  }
  return purse
}

export function purseTotal(purse: Purse, denoms: Denomination[]): number {
  return Math.round(denoms.reduce((sum, d) => sum + (purse[d.code] ?? 0) * d.rate, 0))
}

/** Prices read in the main coin and below: 113 gp, not 1 pp 1 gp 3 sp. */
function priceDenominations(denoms: Denomination[]): Denomination[] {
  const sorted = sortDenominations(denoms)
  const main = sorted.find(d => d.isDefault)
  return main ? sorted.filter(d => d.rate <= main.rate) : sorted
}

/** "1 gp 5 sp" (largest coin first). Zero reads "0 gp". */
export function formatCoins(amount: number, denoms: Denomination[]): string {
  const list = priceDenominations(denoms)
  if (list.length === 0) return String(Math.round(amount))
  let left = Math.round(amount)
  if (left <= 0) return `0 ${(list.find(d => d.isDefault) ?? list[0]!).code.toLowerCase()}`
  const parts: string[] = []
  for (const d of list) {
    const n = Math.floor(left / d.rate)
    if (n > 0) {
      parts.push(`${n.toLocaleString()} ${d.code.toLowerCase()}`)
      left -= n * d.rate
    }
  }
  return parts.join(' ') || `${Math.round(amount)} ${list.at(-1)!.code.toLowerCase()}`
}

/** Base units → the biggest coin that shows it as a whole number (for edit forms). */
export function bestUnit(amount: number, denoms: Denomination[]): { code: string, amount: number } {
  const list = priceDenominations(denoms)
  const fallback = list.find(d => d.isDefault) ?? list[0] ?? { code: 'GP', rate: 100 }
  const value = Math.round(amount)
  if (value === 0) return { code: fallback.code, amount: 0 }
  const fit = list.find(d => value % d.rate === 0) ?? list.at(-1) ?? fallback
  return { code: fit.code, amount: value / fit.rate }
}

export function toBaseUnits(amount: number, code: string, denoms: Denomination[]): number {
  const d = denoms.find(x => x.code === code)
  return Math.round((Number(amount) || 0) * (d?.rate ?? 1))
}

/**
 * Pays `price` (base units) out of a purse, the way you would at a counter:
 * small coins first, then one bigger coin broken with change given back in
 * the largest smaller coins. Returns the new purse, or null if it can't cover it.
 */
export function payFromPurse(purse: Purse, price: number, denoms: Denomination[]): Purse | null {
  const ascending = sortDenominations(denoms).reverse()
  const next: Purse = cleanPurse(purse, ascending)
  let remaining = Math.round(price)
  if (remaining <= 0) return next
  if (purseTotal(next, ascending) < remaining) return null

  // 1) Small coins first, as long as they don't overpay
  for (const d of ascending) {
    const use = Math.min(next[d.code]!, Math.floor(remaining / d.rate))
    next[d.code]! -= use
    remaining -= use * d.rate
  }
  if (remaining === 0) return next

  // 2) Break the smallest coin that covers the rest
  const coin = ascending.find(d => next[d.code]! > 0 && d.rate >= remaining)
  if (!coin) return null
  next[coin.code]! -= 1
  let change = coin.rate - remaining
  for (const d of [...ascending].reverse()) {
    if (d.rate >= coin.rate) continue
    const n = Math.floor(change / d.rate)
    next[d.code]! += n
    change -= n * d.rate
  }
  return next
}
