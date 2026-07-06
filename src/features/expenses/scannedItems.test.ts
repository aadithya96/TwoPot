import { describe, expect, it } from 'vitest'
import { itemisedAmountPaise, itemisedDescription, type ScannedItem } from './scannedItems'

const items: ScannedItem[] = [
  { name: 'Milk 1L', priceRupees: 64, included: true },
  { name: 'Bread', priceRupees: 45, included: true },
  { name: 'Chips', priceRupees: 120, included: true },
  { name: 'Eggs x6', priceRupees: 83, included: true },
]

describe('itemisedAmountPaise', () => {
  it('keeps the grand total (with fees) when all items are included', () => {
    // Grand total 552 > sum of items 312, i.e. 240 of fees/taxes retained.
    expect(itemisedAmountPaise(items, 552)).toBe(55200)
  })

  it('subtracts an excluded item from the grand total, keeping fees', () => {
    const next = items.map((it) => (it.name === 'Chips' ? { ...it, included: false } : it))
    // 552 - 120 = 432
    expect(itemisedAmountPaise(next, 552)).toBe(43200)
  })

  it('never goes below zero when excluded items exceed the total', () => {
    // Grand total 100, but excluding the ₹120 item would take it negative.
    const next = items.map((it) => (it.name === 'Chips' ? { ...it, included: false } : it))
    expect(itemisedAmountPaise(next, 100)).toBe(0)
  })

  it('sums included item prices when there is no grand total', () => {
    const next = items.map((it) => (it.name === 'Chips' ? { ...it, included: false } : it))
    // 64 + 45 + 83 = 192
    expect(itemisedAmountPaise(next, null)).toBe(19200)
  })

  it('rounds fractional rupees to whole paise', () => {
    expect(itemisedAmountPaise([{ name: 'x', priceRupees: 12.505, included: true }], null)).toBe(1251)
  })
})

describe('itemisedDescription', () => {
  it('joins the names of included items', () => {
    const next = items.map((it) => (it.name === 'Chips' ? { ...it, included: false } : it))
    expect(itemisedDescription(next)).toBe('Milk 1L, Bread, Eggs x6')
  })

  it('is empty when nothing is included', () => {
    expect(itemisedDescription(items.map((it) => ({ ...it, included: false })))).toBe('')
  })
})
