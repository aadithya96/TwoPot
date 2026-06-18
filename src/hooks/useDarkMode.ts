import { useUiStore } from '@/stores/uiStore'
import { supabase } from '@/lib/supabase'

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
    await supabase.from('profiles').update({ dark_mode: value }).eq('id', userId)
  } catch {
    // Best-effort persistence; ignore failures.
  }
}
