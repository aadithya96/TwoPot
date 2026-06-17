import { create } from 'zustand'

interface UiState {
  darkMode: boolean
  offlineQueueCount: number
  setDarkMode: (darkMode: boolean) => void
  setOfflineQueueCount: (count: number) => void
}

/** Client-only UI state: dark mode preference and pending offline mutation count. */
export const useUiStore = create<UiState>((set) => ({
  darkMode: false,
  offlineQueueCount: 0,
  setDarkMode: (darkMode) => set({ darkMode }),
  setOfflineQueueCount: (count) => set({ offlineQueueCount: count }),
}))
