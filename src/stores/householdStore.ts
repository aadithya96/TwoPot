import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types/app'

interface HouseholdState {
  householdId: string | null
  members: Profile[]
  setHousehold: (householdId: string, members: Profile[]) => void
  clear: () => void
}

/** Persists the current household ID and its two members to sessionStorage. */
export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set) => ({
      householdId: null,
      members: [],
      setHousehold: (householdId, members) => set({ householdId, members }),
      clear: () => set({ householdId: null, members: [] }),
    }),
    {
      name: 'twopot-household',
      storage: {
        getItem: (name) => {
          const value = sessionStorage.getItem(name)
          return value ? JSON.parse(value) : null
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
)
