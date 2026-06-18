import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Category } from '@/types/app'

/** Editable fields of a category. */
export interface CategoryInput {
  householdId: string
  name: string
  icon: string
  color: string
}

/** Invalidates the caches that embed category data after a category changes. */
function useInvalidateCategoryCaches() {
  const queryClient = useQueryClient()
  return (householdId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories(householdId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsage(householdId) })
    // Expense lists embed the joined category; refresh them all.
    void queryClient.invalidateQueries({ queryKey: ['expenses'] })
  }
}

/** Creates a new category for the household. */
export function useCreateCategory() {
  const invalidate = useInvalidateCategoryCaches()
  return useMutation({
    mutationFn: async (input: CategoryInput): Promise<Category> => {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          household_id: input.householdId,
          name: input.name,
          icon: input.icon,
          color: input.color,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => invalidate(variables.householdId),
  })
}

/** Updates an existing category's name, icon, or color. */
export function useUpdateCategory() {
  const invalidate = useInvalidateCategoryCaches()
  return useMutation({
    mutationFn: async ({ id, ...input }: CategoryInput & { id: string }): Promise<Category> => {
      const { data, error } = await supabase
        .from('categories')
        .update({ name: input.name, icon: input.icon, color: input.color })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => invalidate(variables.householdId),
  })
}

/**
 * Deletes a category. The database sets affected expenses' category to null and
 * cascades the category's budget, so callers should warn before deleting.
 */
export function useDeleteCategory() {
  const invalidate = useInvalidateCategoryCaches()
  return useMutation({
    mutationFn: async (input: { id: string; householdId: string }): Promise<void> => {
      const { error } = await supabase.from('categories').delete().eq('id', input.id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => invalidate(variables.householdId),
  })
}
