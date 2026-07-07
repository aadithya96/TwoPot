import { useState } from 'react'
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import type { Profile, Task, TaskKind, TaskPriority } from '@/types/app'
import { PRIORITY_OPTIONS } from './priority'
import { useCreateTask, useUpdateTask } from './useTasks'

export interface TaskFormDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close. */
  onClose: () => void
  /** Household the item belongs to. */
  householdId: string
  /** Current user id, recorded as the creator on new items. */
  userId: string
  /** Household members, offered as assignees. */
  members: Profile[]
  /** Which section the item belongs to. Ignored when editing (taken from `task`). */
  kind: TaskKind
  /** When set, the dialog edits this item instead of creating a new one. */
  task?: Task
}

/** Dialog for creating or editing a todo/task: title, due date, assignee, and priority. */
export function TaskFormDialog({
  open,
  onClose,
  householdId,
  userId,
  members,
  kind,
  task,
}: TaskFormDialogProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [wasOpen, setWasOpen] = useState(open)

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  // Reset (or hydrate, when editing) the form on the closed -> open transition,
  // using React's "adjust state during render" pattern (see SetBudgetDialog).
  if (open && !wasOpen) {
    setWasOpen(true)
    setTitle(task?.title ?? '')
    setDueDate(task?.due_date ?? '')
    setAssigneeId(task?.assignee_id ?? '')
    setPriority((task?.priority as TaskPriority | undefined) ?? 'medium')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const isEditing = Boolean(task)
  const label = kind === 'task' ? 'task' : kind === 'buy' ? 'item' : 'todo'
  const trimmedTitle = title.trim()
  const isValid = trimmedTitle.length > 0
  const isPending = createTask.isPending || updateTask.isPending

  const handleSave = async () => {
    if (!isValid) return
    if (task) {
      await updateTask.mutateAsync({
        taskId: task.id,
        householdId,
        title: trimmedTitle,
        dueDate: dueDate || null,
        assigneeId: assigneeId || null,
        priority,
      })
    } else {
      await createTask.mutateAsync({
        householdId,
        createdBy: userId,
        kind,
        title: trimmedTitle,
        dueDate: dueDate || null,
        assigneeId: assigneeId || null,
        priority,
      })
    }
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEditing ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            select
            label="Priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            label="Assignee"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
          >
            <MenuItem value="">
              <em>Unassigned</em>
            </MenuItem>
            {members.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                {member.display_name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!isValid || isPending}
          onClick={handleSave}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isEditing ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
