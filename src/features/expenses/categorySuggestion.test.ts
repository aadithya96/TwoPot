import { describe, expect, it } from 'vitest'
import { suggestCategory } from './categorySuggestion'
import type { Category } from '@/types/app'

function category(overrides: Partial<Category> & Pick<Category, 'id' | 'name'>): Category {
  return {
    household_id: 'h1',
    icon: 'CircleOutlined',
    color: '#000000',
    is_default: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const dining = category({ id: 'cat-dining', name: 'Food & Dining' })
const transport = category({ id: 'cat-transport', name: 'Transport' })
const categories = [dining, transport]

describe('suggestCategory', () => {
  it('returns null with no tokens to match', () => {
    expect(suggestCategory('', categories, [])).toBeNull()
  })

  it('falls back to a keyword hint when there is no history', () => {
    expect(suggestCategory('Swiggy order', categories, [])).toBe(dining.id)
    expect(suggestCategory('Uber ride home', categories, [])).toBe(transport.id)
  })

  it('returns null when nothing matches keywords or history', () => {
    expect(suggestCategory('mystery expense', categories, [])).toBeNull()
  })

  it('prefers household history over the keyword fallback', () => {
    const history = [
      { description: 'Coffee with Uber driver', categoryId: dining.id },
      { description: 'Coffee with Uber driver', categoryId: dining.id },
    ]
    // "Uber" would normally suggest Transport, but two prior expenses with
    // overlapping tokens were filed under Dining, so history wins.
    expect(suggestCategory('Uber coffee', categories, history)).toBe(dining.id)
  })

  it('picks the category with the most overlapping votes among several history entries', () => {
    const history = [
      { description: 'Petrol fill up', categoryId: transport.id },
      { description: 'Petrol for bike', categoryId: transport.id },
      { description: 'Petrol station snacks', categoryId: dining.id },
    ]
    expect(suggestCategory('Petrol', categories, history)).toBe(transport.id)
  })

  it('ignores history entries with no token overlap', () => {
    const history = [{ description: 'Movie night', categoryId: dining.id }]
    expect(suggestCategory('Grocery run', categories, history)).toBeNull()
  })
})
