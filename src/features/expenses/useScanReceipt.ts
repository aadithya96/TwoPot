import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types/app'

/** Structured fields returned by the `scan-receipt` edge function, resolved to a category id. */
export interface ReceiptScan {
  /** Total amount on the receipt/order, in rupees, or null if not detected. */
  amountRupees: number | null
  /** Purchase date as ISO "YYYY-MM-DD", or null if not detected. */
  date: string | null
  /** Merchant/business/app name, or null if not detected. */
  merchant: string | null
  /** Best-matching category id from the household's categories, or null. */
  categoryId: string | null
}

/** Raw response shape from the `scan-receipt` edge function. */
interface ScanReceiptResponse {
  amountRupees: number | null
  date: string | null
  merchant: string | null
  category: string | null
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
      const { data, error } = await supabase.functions.invoke<ScanReceiptResponse>('scan-receipt', {
        body: { imageUrl, categories: categories.map((category) => category.name) },
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
      }
    },
  })
}
