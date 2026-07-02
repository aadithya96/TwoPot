import { describe, expect, it } from 'vitest'
import { computeMfMarketValue, estimateUnitsForAmount, isValidUpiVpa } from './backing'
import { parseAmfiDate } from './mfapi'

describe('computeMfMarketValue', () => {
  it('converts units x NAV (rupees) into paise', () => {
    expect(computeMfMarketValue(100, 84.1234)).toBe(841234)
  })

  it('rounds to the nearest paisa', () => {
    expect(computeMfMarketValue(3.3333, 10.1)).toBe(3367) // 33.66633 rupees
  })

  it('is zero for an empty holding', () => {
    expect(computeMfMarketValue(0, 84.1234)).toBe(0)
  })
})

describe('estimateUnitsForAmount', () => {
  it('divides the rupee amount by NAV', () => {
    expect(estimateUnitsForAmount(100000, 100)).toBe(10) // Rs 1000 at NAV 100
  })

  it('truncates (never overstates) to 4 decimals', () => {
    // Rs 1000 at NAV 84.1234 = 11.887299... units
    expect(estimateUnitsForAmount(100000, 84.1234)).toBe(11.8872)
  })

  it('returns 0 when the NAV is unknown or invalid', () => {
    expect(estimateUnitsForAmount(100000, 0)).toBe(0)
    expect(estimateUnitsForAmount(100000, Number.NaN)).toBe(0)
    expect(estimateUnitsForAmount(100000, -5)).toBe(0)
  })
})

describe('isValidUpiVpa', () => {
  it('accepts typical VPAs', () => {
    expect(isValidUpiVpa('name@bank')).toBe(true)
    expect(isValidUpiVpa('first.last-99@okhdfcbank')).toBe(true)
    expect(isValidUpiVpa(' 9876543210@ybl ')).toBe(true)
  })

  it('rejects malformed VPAs', () => {
    expect(isValidUpiVpa('')).toBe(false)
    expect(isValidUpiVpa('no-at-sign')).toBe(false)
    expect(isValidUpiVpa('@bank')).toBe(false)
    expect(isValidUpiVpa('name@')).toBe(false)
    expect(isValidUpiVpa('name@123')).toBe(false)
    expect(isValidUpiVpa('name@bank extra')).toBe(false)
  })
})

describe('parseAmfiDate', () => {
  it('converts DD-MM-YYYY to ISO', () => {
    expect(parseAmfiDate('02-07-2026')).toBe('2026-07-02')
  })

  it('returns null for anything else', () => {
    expect(parseAmfiDate('2026-07-02')).toBeNull()
    expect(parseAmfiDate('2-7-2026')).toBeNull()
    expect(parseAmfiDate('')).toBeNull()
  })
})
