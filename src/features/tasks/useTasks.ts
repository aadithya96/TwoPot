import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { Task, TaskKind, TaskPriority } from '@/types/app'

/**
 * Fetches every todo and task for a household. Both sections live in one table
 * (distinguished by `kind`) and are fetched together so the page reads a single
 * list and splits it client-side. Open items first, then most recently created.
 */
export function useTasks(householdId: string | undefined): UseQueryResult<Task[]> {
  return useQuery({
    queryKey: queryKeys.tasks(householdId ?? 'anonymous'),
    queryFn: async (): Promise<Task[]> => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('household_id', householdId)
        .order('done', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(householdId),
  })
}

/** Input for adding a todo or task. */
export interface CreateTaskInput {
  householdId: string
  createdBy: string
  kind: TaskKind
  title: string
  dueDate: string | null
  assigneeId: string | null
  priority: TaskPriority
}

/** Creates a todo/task, invalidating the household's task list on success. */
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<Task> => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          household_id: input.householdId,
          created_by: input.createdBy,
          kind: input.kind,
          title: input.title,
          due_date: input.dueDate,
          assignee_id: input.assigneeId,
          priority: input.priority,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks(variables.householdId) })
    },
  })
}

/** Input for editing a todo/task's fields. */
export interface UpdateTaskInput {
  taskId: string
  householdId: string
  title: string
  dueDate: string | null
  assigneeId: string | null
  priority: TaskPriority
}

/** Updates a todo/task's title, due date, assignee, and priority. */
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateTaskInput): Promise<Task> => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: input.title,
          due_date: input.dueDate,
          assignee_id: input.assigneeId,
          priority: input.priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.taskId)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks(variables.householdId) })
    },
  })
}

/** Toggles a todo/task's done flag, stamping/clearing `completed_at` to match. */
export function useToggleTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      done,
    }: {
      taskId: string
      householdId: string
      done: boolean
    }): Promise<void> => {
      const { error } = await supabase
        .from('tasks')
        .update({
          done,
          completed_at: done ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks(variables.householdId) })
    },
  })
}

/** Deletes a todo/task, invalidating the household's task list on success. */
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string; householdId: string }): Promise<void> => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks(variables.householdId) })
    },
  })
}
