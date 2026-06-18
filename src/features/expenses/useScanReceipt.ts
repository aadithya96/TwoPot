import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Structured fields returned by the `scan-receipt` edge function. */
export interface ReceiptScan {
  /** Total amount on the receipt, in rupees, or null if not detected. */
  amountRupees: number | null
  /** Purchase date as ISO "YYYY-MM-DD", or null if not detected. */
  date: string | null
  /** Merchant/business name, or null if not detected. */
  merchant: string | null
}

/**
 * Sends an uploaded receipt's URL to the `scan-receipt` edge function, which
 * uses a vision model to extract the amount, date, and merchant for prefilling
 * the add-expense form.
 */
export function useScanReceipt(): UseMutationResult<ReceiptScan, Error, string> {
  return useMutation({
    mutationFn: async (imageUrl: string): Promise<ReceiptScan> => {
      const { data, error } = await supabase.functions.invoke<ReceiptScan>('scan-receipt', {
        body: { imageUrl },
      })
      if (error) throw error
      if (!data) throw new Error('Empty scan response')
      return data
    },
  })
}
