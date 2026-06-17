import { useUiStore } from '@/stores/uiStore'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/db'

/**
 * Minimal typed view over `supabase.from('profiles').update(...)`. The
 * generated `db.ts` stub's table rows omit a `Relationships` field that
 * `@supabase/postgrest-js`'s `update<Row>` generic needs to infer `Row`,
 * which otherwise collapses to `never`. Scoped here rather than editing
 * `src/types/db.ts`, which this agent does not own.
 */
interface ProfilesUpdateClient {
  from(table: 'profiles'): {
    update(values: Database['public']['Tables']['profiles']['Update']): {
      eq(column: 'id', value: string): Promise<{ error: { message: string } | null }>
    }
  }
}

/**
 * Wraps `uiStore`'s dark-mode flag and additionally persists the preference
 * to `profiles.dark_mode` (best-effort, fire-and-forget — UI never blocks
 * on the network write).
 */
export function useDarkMode(): { darkMode: boolean; setDarkMode: (v: boolean) => void } {
  const darkMode = useUiStore((state) => state.darkMode)
  const setStoreDarkMode = useUiStore((state) => state.setDarkMode)

  const setDarkMode = (value: boolean): void => {
    setStoreDarkMode(value)
    void persistDarkMode(value)
  }

  return { darkMode, setDarkMode }
}

async function persistDarkMode(value: boolean): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    if (!userId) return
    const client = supabase as unknown as ProfilesUpdateClient
    await client.from('profiles').update({ dark_mode: value }).eq('id', userId)
  } catch {
    // Best-effort persistence; ignore failures.
  }
}
