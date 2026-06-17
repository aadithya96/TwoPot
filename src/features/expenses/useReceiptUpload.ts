import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'

/** Seconds a signed receipt URL stays valid for (1 year). */
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365

/** Options passed to `browser-image-compression` before a receipt photo is uploaded. */
const COMPRESSION_OPTIONS = { maxSizeMB: 1, maxWidthOrHeight: 1920 }

/** Input for {@link useUploadReceipt}: the household the receipt belongs to and the raw photo file. */
export interface UploadReceiptInput {
  householdId: string
  file: File
}

/**
 * Compresses a receipt photo and uploads it to the Supabase Storage `receipts` bucket,
 * returning a long-lived signed URL for the caller to store on an expense record.
 */
export function useUploadReceipt(): UseMutationResult<string, Error, UploadReceiptInput> {
  return useMutation({
    mutationFn: async ({ householdId, file }: UploadReceiptInput): Promise<string> => {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS)
      const path = `${householdId}/${crypto.randomUUID()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, compressed, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data, error: signError } = await supabase.storage
        .from('receipts')
        .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS)
      if (signError) throw signError

      return data.signedUrl
    },
  })
}
