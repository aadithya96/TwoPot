import type { Category } from '@/types/app'

/** A past expense's description and the category it was filed under. */
export interface CategorizedDescription {
  description: string
  categoryId: string | null
}

/** Common merchant/keyword hints per default category name, used when there's no household history yet. */
const KEYWORD_HINTS: Record<string, string[]> = {
  'Food & Dining': ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'dine', 'lunch', 'dinner', 'breakfast'],
  Transport: ['uber', 'ola', 'cab', 'taxi', 'metro', 'petrol', 'diesel', 'fuel', 'parking', 'auto'],
  Utilities: ['electricity', 'wifi', 'broadband', 'recharge', 'water bill', 'gas bill', 'dth'],
  Health: ['pharmacy', 'medicine', 'doctor', 'hospital', 'clinic', 'medical'],
  Entertainment: ['movie', 'netflix', 'spotify', 'concert', 'cinema', 'game', 'prime video'],
  Groceries: ['grocery', 'groceries', 'supermarket', 'bigbasket', 'zepto', 'blinkit', 'vegetables', 'milk'],
  Home: ['rent', 'maintenance', 'furniture', 'repair', 'plumber', 'electrician'],
  Personal: ['salon', 'haircut', 'clothes', 'shopping', 'spa', 'gym'],
  Travel: ['flight', 'hotel', 'train', 'trip', 'booking', 'airbnb', 'vacation'],
}

function normalize(text: string): string {
  return text.toLowerCase().trim()
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
}

/**
 * Suggests a category id for a free-text expense description.
 *
 * Prefers the household's own history (most frequent category among past
 * expenses sharing a token with `description`), and falls back to a static
 * keyword dictionary for common merchants/spend types when there's no
 * matching history yet. Returns null when nothing matches confidently.
 */
export function suggestCategory(
  description: string,
  categories: Category[],
  history: CategorizedDescription[]
): string | null {
  const tokens = tokenize(description)
  if (tokens.length === 0) return null

  const tokenSet = new Set(tokens)
  const votesByCategory = new Map<string, number>()

  for (const entry of history) {
    if (!entry.categoryId) continue
    const entryTokens = tokenize(entry.description)
    const overlap = entryTokens.filter((token) => tokenSet.has(token)).length
    if (overlap === 0) continue
    votesByCategory.set(entry.categoryId, (votesByCategory.get(entry.categoryId) ?? 0) + overlap)
  }

  if (votesByCategory.size > 0) {
    let bestCategoryId: string | null = null
    let bestVotes = 0
    for (const [categoryId, votes] of votesByCategory) {
      if (votes > bestVotes) {
        bestVotes = votes
        bestCategoryId = categoryId
      }
    }
    return bestCategoryId
  }

  const normalizedDescription = normalize(description)
  for (const category of categories) {
    const keywords = KEYWORD_HINTS[category.name]
    if (!keywords) continue
    if (keywords.some((keyword) => normalizedDescription.includes(keyword))) {
      return category.id
    }
  }

  return null
}
