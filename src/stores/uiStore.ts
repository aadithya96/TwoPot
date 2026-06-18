import { create } from 'zustand'

const DARK_MODE_KEY = 'twopot:darkMode'

/** Reads the persisted dark-mode choice, falling back to the OS preference. */
function initialDarkMode(): boolean {
  try {
    const stored = localStorage.getItem(DARK_MODE_KEY)
    if (stored != null) return stored === '1'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

interface UiState {
  darkMode: boolean
  offlineQueueCount: number
  setDarkMode: (darkMode: boolean) => void
  setOfflineQueueCount: (count: number) => void
}

/** Client-only UI state: dark mode preference and pending offline mutation count. */
export const useUiStore = create<UiState>((set) => ({
  darkMode: initialDarkMode(),
  offlineQueueCount: 0,
  setDarkMode: (darkMode) => {
    try {
      localStorage.setItem(DARK_MODE_KEY, darkMode ? '1' : '0')
    } catch {
      // Ignore storage failures (e.g. private mode); preference is in-memory.
    }
    set({ darkMode })
  },
  setOfflineQueueCount: (count) => set({ offlineQueueCount: count }),
}))
