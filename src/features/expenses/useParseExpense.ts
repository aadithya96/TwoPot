import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types/app'

/** Expense fields parsed from a natural-language note, resolved to a category id. */
export interface ParsedExpense {
  amountRupees: number | null
  date: string | null
  description: string | null
  categoryId: string | null
}

interface ParseExpenseResponse {
  amountRupees: number | null
  date: string | null
  description: string | null
  categoryName: string | null
}

/** Input for {@link useParseExpense}: the note plus the household's categories. */
export interface ParseExpenseInput {
  text: string
  categories: Category[]
}

/**
 * Sends a natural-language note (e.g. "250 groceries yesterday") to the
 * `parse-expense` edge function and maps the returned category name back to a
 * category id for prefilling the add-expense form.
 */
export function useParseExpense(): UseMutationResult<ParsedExpense, Error, ParseExpenseInput> {
  return useMutation({
    mutationFn: async ({ text, categories }: ParseExpenseInput): Promise<ParsedExpense> => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase.functions.invoke<ParseExpenseResponse>('parse-expense', {
        body: { text, today, categories: categories.map((category) => category.name) },
      })
      if (error) throw error
      if (!data) throw new Error('Empty parse response')

      const match = data.categoryName
        ? categories.find((category) => category.name.toLowerCase() === data.categoryName!.toLowerCase())
        : undefined

      return {
        amountRupees: data.amountRupees,
        date: data.date,
        description: data.description,
        categoryId: match?.id ?? null,
      }
    },
  })
}
