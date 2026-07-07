import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types/app'

/** A single purchased line item extracted from a receipt or order screenshot. */
export interface ReceiptItem {
  /** Short human-readable item name (may include quantity, e.g. "Milk 1L x2"). */
  name: string
  /** Line total for the item in rupees, or null if the price wasn't shown. */
  priceRupees: number | null
}

/** Structured fields returned by the `scan-receipt` edge function, resolved to a category id. */
export interface ReceiptScan {
  /** Grand total on the receipt/order (incl. fees/taxes), in rupees, or null if not detected. */
  amountRupees: number | null
  /** Purchase date as ISO "YYYY-MM-DD", or null if not detected. */
  date: string | null
  /** Merchant/business/app name, or null if not detected. */
  merchant: string | null
  /** Best-matching category id from the household's categories, or null. */
  categoryId: string | null
  /** Purchased line items (excludes fees/taxes); empty when none were detected. */
  items: ReceiptItem[]
}

/** Raw response shape from the `scan-receipt` edge function. */
interface ScanReceiptResponse {
  amountRupees: number | null
  date: string | null
  merchant: string | null
  category: string | null
  items?: ReceiptItem[]
}

/** Input for {@link useScanReceipt}: the uploaded image URL plus the household's categories. */
export interface ScanReceiptInput {
  imageUrl: string
  categories: Category[]
}

/**
 * Sends an uploaded image's URL to the `scan-receipt` edge function, which uses
 * a vision model to extract the amount, date, merchant, and best-matching
 * category from a receipt or an online-order screenshot (Blinkit, Swiggy, …)
 * for prefilling the add-expense form.
 */
export function useScanReceipt(): UseMutationResult<ReceiptScan, Error, ScanReceiptInput> {
  return useMutation({
    mutationFn: async ({ imageUrl, categories }: ScanReceiptInput): Promise<ReceiptScan> => {
      // Pass today's date so the model can resolve a year-less or ambiguous
      // receipt date to the correct year instead of guessing (a wrong year files
      // the expense outside the current month, hiding it from the month views).
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase.functions.invoke<ScanReceiptResponse>('scan-receipt', {
        body: { imageUrl, today, categories: categories.map((category) => category.name) },
      })
      if (error) throw error
      if (!data) throw new Error('Empty scan response')

      const match = data.category
        ? categories.find((category) => category.name.toLowerCase() === data.category!.toLowerCase())
        : undefined

      return {
        amountRupees: data.amountRupees,
        date: data.date,
        merchant: data.merchant,
        categoryId: match?.id ?? null,
        items: Array.isArray(data.items) ? data.items : [],
      }
    },
  })
}
