import { useState, type MouseEvent } from 'react'
import {
  Avatar,
  Box,
  Checkbox,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EventIcon from '@mui/icons-material/Event'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import UndoIcon from '@mui/icons-material/Undo'
import type { Profile, Task } from '@/types/app'
import { formatRelativeDate } from '@/lib/dates'
import { useSwipeToDelete } from '@/hooks/useSwipeToDelete'
import { priorityMeta } from './priority'
import { useDeleteTask, useToggleTask } from './useTasks'

export interface TaskRowProps {
  task: Task
  householdId: string
  /** Household members, used to resolve the assignee avatar/name. */
  members: Profile[]
  /** Opens the edit dialog for this item. */
  onEdit: (task: Task) => void
}

function isOverdue(dueDate: string, done: boolean): boolean {
  if (done) return false
  const today = new Date().toISOString().slice(0, 10)
  return dueDate < today
}

/**
 * A single task row: done checkbox, title, priority/due chips, assignee avatar,
 * and an overflow menu (edit/delete). Swiping the row left reveals a quick
 * "Done" action (or "Reopen" for a completed item), reusing the same
 * swipe-to-reveal gesture as the expense list.
 */
export function TaskRow({ task, householdId, members, onEdit }: TaskRowProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()
  const { ref, offsetX, isDragging, reset } = useSwipeToDelete()

  const assignee = task.assignee_id ? members.find((m) => m.id === task.assignee_id) : undefined
  const priority = priorityMeta(task.priority)
  const overdue = task.due_date ? isOverdue(task.due_date, task.done) : false

  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget)
  const closeMenu = () => setMenuAnchor(null)

  const setDone = (done: boolean) => toggleTask.mutate({ taskId: task.id, householdId, done })

  const handleSwipeToggle = () => {
    setDone(!task.done)
    reset()
  }

  const handleEdit = () => {
    closeMenu()
    onEdit(task)
  }

  const handleDelete = () => {
    closeMenu()
    void deleteTask.mutate({ taskId: task.id, householdId })
  }

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 1 }}>
      {/* Revealed behind the row on left-swipe: tap to toggle completion. */}
      {offsetX < 0 && (
        <Box
          role="button"
          aria-label={task.done ? `Reopen "${task.title}"` : `Mark "${task.title}" done`}
          onClick={handleSwipeToggle}
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            pr: 2.5,
            backgroundColor: task.done ? 'action.selected' : 'success.main',
            color: task.done ? 'text.primary' : 'success.contrastText',
            cursor: 'pointer',
          }}
        >
          {task.done ? <UndoIcon /> : <CheckCircleIcon />}
          <Typography variant="labelLarge">{task.done ? 'Reopen' : 'Done'}</Typography>
        </Box>
      )}

      <Box
        ref={ref}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          py: 0.5,
          backgroundColor: 'background.paper',
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          touchAction: 'pan-y',
        }}
      >
        <Checkbox
          checked={task.done}
          onChange={(event) => setDone(event.target.checked)}
          slotProps={{ input: { 'aria-label': `Mark "${task.title}" done` } }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="bodyLarge"
            sx={{
              textDecoration: task.done ? 'line-through' : 'none',
              color: task.done ? 'text.disabled' : 'text.primary',
              wordBreak: 'break-word',
            }}
          >
            {task.title}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}
          >
            {!task.done && priority.value !== 'medium' && (
              <Chip label={priority.label} size="small" color={priority.color} variant="outlined" />
            )}
            {task.due_date && (
              <Chip
                icon={<EventIcon />}
                label={formatRelativeDate(task.due_date)}
                size="small"
                variant="outlined"
                color={overdue ? 'error' : 'default'}
              />
            )}
            {assignee && (
              <Tooltip title={assignee.display_name}>
                <Avatar
                  src={assignee.avatar_url ?? undefined}
                  alt={assignee.display_name}
                  sx={{ width: 22, height: 22, fontSize: 12 }}
                >
                  {assignee.display_name.trim().charAt(0).toUpperCase()}
                </Avatar>
              </Tooltip>
            )}
          </Stack>
        </Box>
        <IconButton aria-label="More actions" onClick={openMenu} sx={{ flexShrink: 0 }}>
          <MoreVertIcon />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
          <MenuItem onClick={handleEdit}>Edit</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            Delete
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  )
}
