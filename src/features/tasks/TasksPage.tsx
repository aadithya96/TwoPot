import { useMemo, useState } from 'react'
import { Box, Button, Divider, List, Paper, Skeleton, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useHouseholdStore } from '@/stores/householdStore'
import { useCurrentUser } from '@/features/auth/useAuth'
import type { Task, TaskKind, TaskPriority } from '@/types/app'
import { byPriority } from './priority'
import { useTasks } from './useTasks'
import { useRealtimeTasks } from './useRealtimeTasks'
import { TaskRow } from './TaskRow'
import { TaskFormDialog } from './TaskFormDialog'

/** Open items first; then by priority (high first); then by soonest due date (undated last); then newest. */
function compareTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1
  const priorityDelta = byPriority(a.priority as TaskPriority, b.priority as TaskPriority)
  if (priorityDelta !== 0) return priorityDelta
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date < b.due_date ? -1 : 1
  }
  return a.created_at < b.created_at ? 1 : -1
}

interface SectionProps {
  kind: TaskKind
  title: string
  emptyCopy: string
  tasks: Task[]
  isLoading: boolean
  householdId: string
  members: ReturnType<typeof useHouseholdStore.getState>['members']
  onAdd: (kind: TaskKind) => void
  onEdit: (task: Task) => void
}

function TaskSection({
  kind,
  title,
  emptyCopy,
  tasks,
  isLoading,
  householdId,
  members,
  onAdd,
  onEdit,
}: SectionProps) {
  const openCount = tasks.filter((task) => !task.done).length

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
          <Typography variant="titleMedium">{title}</Typography>
          {!isLoading && (
            <Typography variant="bodyMedium" color="text.secondary">
              {openCount} open
            </Typography>
          )}
        </Stack>
        <Button size="small" startIcon={<AddIcon />} onClick={() => onAdd(kind)}>
          Add
        </Button>
      </Stack>
      <Divider />
      {isLoading ? (
        <Stack spacing={1} sx={{ p: 2 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={32} />
          ))}
        </Stack>
      ) : tasks.length === 0 ? (
        <Typography variant="bodyMedium" color="text.secondary" sx={{ px: 2, py: 3 }}>
          {emptyCopy}
        </Typography>
      ) : (
        <List sx={{ px: 2, py: 0.5 }}>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              householdId={householdId}
              members={members}
              onEdit={onEdit}
            />
          ))}
        </List>
      )}
    </Paper>
  )
}

/**
 * Tasks hub: three shared, realtime-synced sections on one page -- quick
 * "Todos", a "Tasks" list, and a "Things to buy" shopping list -- each
 * supporting due dates, an assignee, and a priority.
 */
export function TasksPage() {
  const householdId = useHouseholdStore((state) => state.householdId)
  const members = useHouseholdStore((state) => state.members)
  const { data: currentUser } = useCurrentUser()
  const { data: tasks, isLoading } = useTasks(householdId ?? undefined)

  const [dialogKind, setDialogKind] = useState<TaskKind>('todo')
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  useRealtimeTasks(householdId ?? undefined)

  const { todos, taskItems, buyItems } = useMemo(() => {
    const all = tasks ?? []
    return {
      todos: all.filter((task) => task.kind === 'todo').sort(compareTasks),
      taskItems: all.filter((task) => task.kind === 'task').sort(compareTasks),
      buyItems: all.filter((task) => task.kind === 'buy').sort(compareTasks),
    }
  }, [tasks])

  if (!householdId || !currentUser) return null

  const handleAdd = (kind: TaskKind) => {
    setDialogKind(kind)
    setEditingTask(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (task: Task) => {
    setDialogKind(task.kind as TaskKind)
    setEditingTask(task)
    setDialogOpen(true)
  }

  return (
    <Box sx={{ p: 2, pb: 10, maxWidth: 760, mx: 'auto' }}>
      <Typography variant="headlineSmall" sx={{ mb: 2 }}>
        Your lists
      </Typography>

      <Stack spacing={3}>
        <TaskSection
          kind="todo"
          title="Todos"
          emptyCopy="No todos yet. Add a quick one to get started."
          tasks={todos}
          isLoading={isLoading}
          householdId={householdId}
          members={members}
          onAdd={handleAdd}
          onEdit={handleEdit}
        />
        <TaskSection
          kind="task"
          title="Tasks"
          emptyCopy="No tasks yet. Add one with a due date, assignee, and priority."
          tasks={taskItems}
          isLoading={isLoading}
          householdId={householdId}
          members={members}
          onAdd={handleAdd}
          onEdit={handleEdit}
        />
        <TaskSection
          kind="buy"
          title="Things to buy"
          emptyCopy="Nothing on the shopping list yet. Add something you need to buy."
          tasks={buyItems}
          isLoading={isLoading}
          householdId={householdId}
          members={members}
          onAdd={handleAdd}
          onEdit={handleEdit}
        />
      </Stack>

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        householdId={householdId}
        userId={currentUser.id}
        members={members}
        kind={dialogKind}
        task={editingTask}
      />
    </Box>
  )
}
