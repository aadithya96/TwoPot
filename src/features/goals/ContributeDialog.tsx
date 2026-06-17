import { useState } from 'react'
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { formatINR, toStorageAmount } from '@/lib/currency'
import type { Profile, SavingsGoal } from '@/types/app'
import { useContribute } from './useGoals'
import { estimateProjectedCompletion } from './projection'

export interface ContributeDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close. */
  onClose: () => void
  /** Goal being contributed to. */
  goal: SavingsGoal
  /** The two household members, for the "who's contributing" toggle. */
  members: Profile[]
  /** Average daily contribution rate (paise/day) used for the live projection preview. */
  averageDailyRate: number
}

/** Dialog for recording a contribution to a savings goal, with a live projected-completion preview. */
export function ContributeDialog({ open, onClose, goal, members, averageDailyRate }: ContributeDialogProps) {
  const [amountDisplay, setAmountDisplay] = useState('')
  const [userId, setUserId] = useState(members[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  const contribute = useContribute()

  // Reset form fields whenever the dialog transitions from closed to open (React's
  // recommended "adjust state during render" pattern, avoiding a setState-in-effect).
  if (open && !wasOpen) {
    setWasOpen(true)
    setAmountDisplay('')
    setUserId(members[0]?.id ?? '')
    setNote('')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  const amount = toStorageAmount(amountDisplay)
  const isValid = amount > 0 && Boolean(userId)

  const projectedAmount = goal.current_amount + amount
  const projection = estimateProjectedCompletion({
    currentAmount: projectedAmount,
    targetAmount: goal.target_amount,
    averageDailyRate,
  })

  const handleContribute = async () => {
    if (!isValid) return
    await contribute.mutateAsync({
      goalId: goal.id,
      householdId: goal.household_id,
      userId,
      amount,
      note: note.trim() || null,
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Contribute to {goal.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Amount"
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

          <ToggleButtonGroup
            value={userId}
            exclusive
            onChange={(_event, value: string | null) => {
              if (value) setUserId(value)
            }}
            fullWidth
          >
            {members.map((member) => (
              <ToggleButton key={member.id} value={member.id}>
                {member.display_name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField
            label="Note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
          />

          {amount > 0 && (
            <Typography variant="bodyMedium" color="text.secondary">
              New balance: {formatINR(projectedAmount)} of {formatINR(goal.target_amount)}
              {projection ? ` — projected completion ${projection}` : ''}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!isValid || contribute.isPending}
          onClick={handleContribute}
          startIcon={contribute.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Contribute
        </Button>
      </DialogActions>
    </Dialog>
  )
}
