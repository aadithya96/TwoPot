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
import { useSnackbar } from 'notistack'
import { fromStorageAmount, toStorageAmount } from '@/lib/currency'
import type { SavingsGoal } from '@/types/app'
import { GoalIcon } from './GoalIcon'
import { GOAL_ICON_KEYS } from './goalIcons'
import { useUpdateGoal } from './useGoals'

/** Preset color swatches for a savings goal's top strip (mirrors CreateGoalDialog). */
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

export interface EditGoalDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close. */
  onClose: () => void
  /** The goal being edited. */
  goal: SavingsGoal
}

/**
 * Dialog for editing an existing savings goal's name, target amount, deadline, icon, and color.
 * How the goal is backed (manual / bank / mutual fund) is fixed at creation and not editable here,
 * since it governs how the goal's value is tracked.
 */
export function EditGoalDialog({ open, onClose, goal }: EditGoalDialogProps) {
  const [name, setName] = useState(goal.name)
  const [amountDisplay, setAmountDisplay] = useState(String(fromStorageAmount(goal.target_amount)))
  const [deadline, setDeadline] = useState(goal.deadline ?? '')
  const [icon, setIcon] = useState(goal.icon)
  const [color, setColor] = useState(goal.color)
  const updateGoal = useUpdateGoal()
  const { enqueueSnackbar } = useSnackbar()

  // Re-seed the form when the dialog is (re)opened for a different goal, or reopened after edits.
  const [syncedKey, setSyncedKey] = useState<string | null>(null)
  const openKey = open ? goal.id : null
  if (open && openKey !== syncedKey) {
    setSyncedKey(openKey)
    setName(goal.name)
    setAmountDisplay(String(fromStorageAmount(goal.target_amount)))
    setDeadline(goal.deadline ?? '')
    setIcon(goal.icon)
    setColor(goal.color)
  } else if (!open && syncedKey !== null) {
    setSyncedKey(null)
  }

  const isValid = name.trim().length > 0 && toStorageAmount(amountDisplay) > 0

  const handleSave = async () => {
    if (!isValid) return
    try {
      await updateGoal.mutateAsync({
        goalId: goal.id,
        householdId: goal.household_id,
        name: name.trim(),
        icon,
        color,
        targetAmount: toStorageAmount(amountDisplay),
        deadline: deadline || null,
        currentAmount: goal.current_amount,
      })
      onClose()
    } catch {
      enqueueSnackbar('Could not save goal', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Edit savings goal</DialogTitle>
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
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              },
              htmlInput: { inputMode: 'decimal' },
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
          disabled={!isValid || updateGoal.isPending}
          onClick={handleSave}
          startIcon={updateGoal.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
