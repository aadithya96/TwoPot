import { useState, type MouseEvent } from 'react'
import {
  Avatar,
  Box,
  Checkbox,
  Chip,
  IconButton,
  ListItem,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EventIcon from '@mui/icons-material/Event'
import type { Profile, Task } from '@/types/app'
import { formatRelativeDate } from '@/lib/dates'
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

/** A single task row: done checkbox, title, priority/due chips, assignee avatar, overflow menu. */
export function TaskRow({ task, householdId, members, onEdit }: TaskRowProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()

  const assignee = task.assignee_id ? members.find((m) => m.id === task.assignee_id) : undefined
  const priority = priorityMeta(task.priority)
  const overdue = task.due_date ? isOverdue(task.due_date, task.done) : false

  const openMenu = (event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget)
  const closeMenu = () => setMenuAnchor(null)

  const handleEdit = () => {
    closeMenu()
    onEdit(task)
  }

  const handleDelete = () => {
    closeMenu()
    void deleteTask.mutate({ taskId: task.id, householdId })
  }

  return (
    <ListItem
      disableGutters
      secondaryAction={
        <>
          <IconButton edge="end" aria-label="More actions" onClick={openMenu}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
            <MenuItem onClick={handleEdit}>Edit</MenuItem>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              Delete
            </MenuItem>
          </Menu>
        </>
      }
      sx={{ alignItems: 'flex-start', py: 0.5 }}
    >
      <Checkbox
        checked={task.done}
        onChange={(event) =>
          toggleTask.mutate({ taskId: task.id, householdId, done: event.target.checked })
        }
        sx={{ mt: -0.25 }}
        slotProps={{ input: { 'aria-label': `Mark "${task.title}" done` } }}
      />
      <Box sx={{ flex: 1, minWidth: 0, pr: 5 }}>
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
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
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
    </ListItem>
  )
}
