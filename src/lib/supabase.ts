import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

/** Typed Supabase client, configured for persistent session auth. */
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'twopot-auth',
    },
  }
)
