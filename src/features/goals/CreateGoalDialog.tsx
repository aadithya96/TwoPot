import { useEffect, useState } from 'react'
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
import Flight from '@mui/icons-material/Flight'
import Home from '@mui/icons-material/Home'
import DirectionsCar from '@mui/icons-material/DirectionsCar'
import School from '@mui/icons-material/School'
import Favorite from '@mui/icons-material/Favorite'
import BeachAccess from '@mui/icons-material/BeachAccess'
import Savings from '@mui/icons-material/Savings'
import Celebration from '@mui/icons-material/Celebration'
import { toStorageAmount } from '@/lib/currency'
import { useCreateGoal } from './useGoals'

/** Preset icon choices for a savings goal, keyed by the string stored on the `savings_goals` row. */
const ICON_OPTIONS: { key: string; Icon: typeof Flight }[] = [
  { key: 'flight', Icon: Flight },
  { key: 'home', Icon: Home },
  { key: 'car', Icon: DirectionsCar },
  { key: 'school', Icon: School },
  { key: 'favorite', Icon: Favorite },
  { key: 'beach', Icon: BeachAccess },
  { key: 'savings', Icon: Savings },
  { key: 'celebration', Icon: Celebration },
]

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
  const [icon, setIcon] = useState(ICON_OPTIONS[0].key)
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const createGoal = useCreateGoal()

  useEffect(() => {
    if (open) {
      setName('')
      setAmountDisplay('')
      setDeadline('')
      setIcon(ICON_OPTIONS[0].key)
      setColor(COLOR_OPTIONS[0])
    }
  }, [open])

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
              {ICON_OPTIONS.map(({ key, Icon }) => (
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
                  <Icon />
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
