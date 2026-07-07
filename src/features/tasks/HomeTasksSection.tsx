import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { List, Link, Paper, Stack, Typography } from '@mui/material'
import type { Profile, Task, TaskKind, TaskPriority } from '@/types/app'
import { useTasks } from './useTasks'
import { useRealtimeTasks } from './useRealtimeTasks'
import { TaskRow } from './TaskRow'
import { TaskFormDialog } from './TaskFormDialog'

/** How many days out counts as "upcoming" for the home dashboard. */
const UPCOMING_DAYS = 7
/** Cap so the section stays a glanceable summary, not the full list. */
const MAX_ITEMS = 5

export interface HomeTasksSectionProps {
  householdId: string
  userId: string
  members: Profile[]
}

/** Whether an open item is worth surfacing on Home: high priority, or due within the week (incl. overdue). */
function isUpcomingOrPriority(task: Task, horizon: string): boolean {
  if (task.done) return false
  if (task.priority === 'high') return true
  return task.due_date != null && task.due_date <= horizon
}

/** Soonest due first (undated last), then higher priority. */
function compareUrgency(a: Task, b: Task): number {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date < b.due_date ? -1 : 1
  }
  const rank = { high: 0, medium: 1, low: 2 } as Record<TaskPriority, number>
  return rank[a.priority as TaskPriority] - rank[b.priority as TaskPriority]
}

/**
 * Home dashboard widget listing the household's upcoming or high-priority open
 * items across every list. Renders nothing when there's nothing pressing, so it
 * only takes space when it has something to say.
 */
export function HomeTasksSection({ householdId, userId, members }: HomeTasksSectionProps) {
  const { data: tasks } = useTasks(householdId)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  useRealtimeTasks(householdId)

  const pressing = useMemo(() => {
    const horizonDate = new Date()
    horizonDate.setDate(horizonDate.getDate() + UPCOMING_DAYS)
    const horizon = horizonDate.toISOString().slice(0, 10)
    return (tasks ?? [])
      .filter((task) => isUpcomingOrPriority(task, horizon))
      .sort(compareUrgency)
      .slice(0, MAX_ITEMS)
  }, [tasks])

  if (pressing.length === 0) return null

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="titleMedium">Upcoming &amp; priority</Typography>
        <Link component={RouterLink} to="/tasks" variant="labelLarge">
          See all
        </Link>
      </Stack>
      <List sx={{ py: 0.5 }}>
        {pressing.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            householdId={householdId}
            members={members}
            onEdit={handleEdit}
          />
        ))}
      </List>

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        householdId={householdId}
        userId={userId}
        members={members}
        kind={(editingTask?.kind as TaskKind | undefined) ?? 'todo'}
        task={editingTask}
      />
    </Paper>
  )
}
