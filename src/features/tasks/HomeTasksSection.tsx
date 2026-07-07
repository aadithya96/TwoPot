import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Link, Paper, Stack, Typography } from '@mui/material'
import type { Profile, Task, TaskKind, TaskPriority } from '@/types/app'
import { useTasks } from './useTasks'
import { useRealtimeTasks } from './useRealtimeTasks'
import { TaskRow } from './TaskRow'
import { TaskFormDialog } from './TaskFormDialog'

/** Cap per group so the widget stays a glanceable summary, not the full list. */
const MAX_PER_GROUP = 5

export interface HomeTasksSectionProps {
  householdId: string
  userId: string
  members: Profile[]
}

/** Higher priority first, then soonest due (undated last), then newest. */
function compareForHome(a: Task, b: Task): number {
  const rank = { high: 0, medium: 1, low: 2 } as Record<TaskPriority, number>
  const priorityDelta = rank[a.priority as TaskPriority] - rank[b.priority as TaskPriority]
  if (priorityDelta !== 0) return priorityDelta
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date < b.due_date ? -1 : 1
  }
  return a.created_at < b.created_at ? 1 : -1
}

/**
 * Home dashboard widget showing the household's open tasks and shopping items,
 * each actionable in place (tick to complete, ⋯ to edit/delete). Renders nothing
 * when both lists are clear, so it only takes space when there's something to do.
 */
export function HomeTasksSection({ householdId, userId, members }: HomeTasksSectionProps) {
  const { data: tasks } = useTasks(householdId)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  useRealtimeTasks(householdId)

  const { openTasks, openBuys } = useMemo(() => {
    const open = (tasks ?? []).filter((task) => !task.done)
    return {
      openTasks: open
        .filter((task) => task.kind === 'task')
        .sort(compareForHome)
        .slice(0, MAX_PER_GROUP),
      openBuys: open
        .filter((task) => task.kind === 'buy')
        .sort(compareForHome)
        .slice(0, MAX_PER_GROUP),
    }
  }, [tasks])

  if (openTasks.length === 0 && openBuys.length === 0) return null

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  // Only label the groups when both are present; a single group reads fine under
  // the card title on its own.
  const showGroupLabels = openTasks.length > 0 && openBuys.length > 0

  const renderGroup = (label: string, items: Task[]) =>
    items.length === 0 ? null : (
      <>
        {showGroupLabels && (
          <Typography variant="labelLarge" color="text.secondary" sx={{ mt: 1 }}>
            {label}
          </Typography>
        )}
        <Box sx={{ py: 0.5 }}>
          {items.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              householdId={householdId}
              members={members}
              onEdit={handleEdit}
            />
          ))}
        </Box>
      </>
    )

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="titleMedium">Tasks &amp; shopping</Typography>
        <Link component={RouterLink} to="/tasks" variant="labelLarge">
          See all
        </Link>
      </Stack>

      {renderGroup('Tasks', openTasks)}
      {renderGroup('To buy', openBuys)}

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        householdId={householdId}
        userId={userId}
        members={members}
        kind={(editingTask?.kind as TaskKind | undefined) ?? 'task'}
        task={editingTask}
      />
    </Paper>
  )
}
