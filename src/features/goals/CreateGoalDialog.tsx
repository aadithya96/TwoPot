import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { toStorageAmount } from '@/lib/currency'
import { GoalIcon } from './GoalIcon'
import { GOAL_ICON_KEYS } from './goalIcons'
import { useCreateGoal } from './useGoals'

/** Preset color swatches for a savings goal's top strip. */
const COLOR_OPTIONS = [
  '#6750A4',
  '#B3261E',
  '#386A20',
  '#0061A4',
  '#9C4146',
  '#7D5260',
  '#006A6A',
  '#984061',
]

export interface CreateGoalDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close. */
  onClose: () => void
  /** Household the goal belongs to. */
  householdId: string
}

/** Dialog for creating a new savings goal: name, target amount, optional deadline, icon, and color. */
export function CreateGoalDialog({ open, onClose, householdId }: CreateGoalDialogProps) {
  const [name, setName] = useState('')
  const [amountDisplay, setAmountDisplay] = useState('')
  const [deadline, setDeadline] = useState('')
  const [icon, setIcon] = useState(GOAL_ICON_KEYS[0])
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [wasOpen, setWasOpen] = useState(open)
  const createGoal = useCreateGoal()

  // Reset form fields whenever the dialog transitions from closed to open (React's
  // recommended "adjust state during render" pattern, avoiding a setState-in-effect).
  if (open && !wasOpen) {
    setWasOpen(true)
    setName('')
    setAmountDisplay('')
    setDeadline('')
    setIcon(GOAL_ICON_KEYS[0])
    setColor(COLOR_OPTIONS[0])
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const isValid = name.trim().length > 0 && toStorageAmount(amountDisplay) > 0

  const handleCreate = async () => {
    if (!isValid) return
    await createGoal.mutateAsync({
      householdId,
      name: name.trim(),
      icon,
      color,
      targetAmount: toStorageAmount(amountDisplay),
      deadline: deadline || null,
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New savings goal</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Goal name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField
            label="Target amount"
            type="text"
            value={amountDisplay}
            onChange={(event) => {
              const next = event.target.value
              if (/^[0-9]*\.?[0-9]*$/.test(next)) setAmountDisplay(next)
            }}
            slotProps={{
              input: {
                inputMode: 'decimal',
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              },
            }}
          />
          <TextField
            label="Deadline (optional)"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <Box>
            <Typography variant="labelMedium" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Icon
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {GOAL_ICON_KEYS.map((key) => (
                <IconButton
                  key={key}
                  onClick={() => setIcon(key)}
                  sx={{
                    border: 2,
                    borderColor: icon === key ? 'primary.main' : 'transparent',
                    bgcolor: icon === key ? 'primary.light' : 'transparent',
                  }}
                  aria-label={key}
                >
                  <GoalIcon icon={key} />
                </IconButton>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="labelMedium" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Color
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map((swatch) => (
                <Box
                  key={swatch}
                  component="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`color ${swatch}`}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: swatch,
                    border: 3,
                    borderColor: color === swatch ? 'text.primary' : 'transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!isValid || createGoal.isPending}
          onClick={handleCreate}
          startIcon={createGoal.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
