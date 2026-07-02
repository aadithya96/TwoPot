import { useEffect, useState } from 'react'
import {
  Alert,
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
import QrCodeOutlinedIcon from '@mui/icons-material/QrCodeOutlined'
import { formatINR, toStorageAmount } from '@/lib/currency'
import { buildUpiPayLink } from '@/lib/upi'
import type { Profile, SavingsGoal } from '@/types/app'
import { useContribute } from './useGoals'
import { estimateProjectedCompletion } from './projection'
import { computeMfMarketValue, estimateUnitsForAmount } from './backing'
import { fetchLatestNav } from './mfapi'

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

/**
 * Dialog for recording a contribution to a savings goal, with a live projected-completion preview.
 * Bank-backed goals get a "Pay via UPI" deep link that moves the money to the backing account;
 * mutual-fund-backed goals record the units the contribution bought so the goal keeps tracking
 * market value.
 */
export function ContributeDialog({ open, onClose, goal, members, averageDailyRate }: ContributeDialogProps) {
  const [amountDisplay, setAmountDisplay] = useState('')
  const [userId, setUserId] = useState(members[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [unitsDisplay, setUnitsDisplay] = useState('')
  const [nav, setNav] = useState<number | null>(goal.backing_mf_nav)
  const [wasOpen, setWasOpen] = useState(open)
  const contribute = useContribute()

  const isBankBacked = goal.backing_type === 'bank_account'
  const isMfBacked = goal.backing_type === 'mutual_fund'

  // Reset form fields whenever the dialog transitions from closed to open (React's
  // recommended "adjust state during render" pattern, avoiding a setState-in-effect).
  if (open && !wasOpen) {
    setWasOpen(true)
    setAmountDisplay('')
    setUserId(members[0]?.id ?? '')
    setNote('')
    setUnitsDisplay('')
    setNav(goal.backing_mf_nav)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  // MF-backed goals need a NAV to convert the amount into units; fetch the
  // latest one if the goal doesn't have one stored yet (e.g. created offline).
  useEffect(() => {
    if (!open || !isMfBacked || nav !== null || goal.backing_mf_scheme_code === null) return
    const controller = new AbortController()
    fetchLatestNav(goal.backing_mf_scheme_code, controller.signal)
      .then((latest) => {
        if (latest) setNav(latest.nav)
      })
      .catch(() => {
        // Leave nav null; the dialog explains and disables the action below.
      })
    return () => controller.abort()
  }, [open, isMfBacked, nav, goal.backing_mf_scheme_code])

  const amount = toStorageAmount(amountDisplay)
  const estimatedUnits = nav !== null ? estimateUnitsForAmount(amount, nav) : 0
  const units = unitsDisplay === '' ? estimatedUnits : (Number.parseFloat(unitsDisplay) || 0)
  const isValid = amount > 0 && Boolean(userId) && (!isMfBacked || (nav !== null && units > 0))

  const projectedAmount = isMfBacked && nav !== null
    ? goal.current_amount + computeMfMarketValue(units, nav)
    : goal.current_amount + amount
  const projection = estimateProjectedCompletion({
    currentAmount: projectedAmount,
    targetAmount: goal.target_amount,
    averageDailyRate,
  })

  const upiLink =
    isBankBacked && goal.backing_upi_vpa && amount > 0
      ? buildUpiPayLink({
          vpa: goal.backing_upi_vpa,
          payeeName: goal.backing_bank_label ?? goal.name,
          amount,
          note: `TwoPot goal: ${goal.name}`,
        })
      : null

  const handleContribute = async () => {
    if (!isValid) return
    await contribute.mutateAsync({
      goalId: goal.id,
      householdId: goal.household_id,
      userId,
      amount,
      note: note.trim() || null,
      ...(isMfBacked && { mfUnits: units }),
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

          {isBankBacked && (
            <>
              {upiLink ? (
                <Button variant="outlined" startIcon={<QrCodeOutlinedIcon />} component="a" href={upiLink}>
                  Pay via UPI to {goal.backing_bank_label ?? 'backing account'}
                </Button>
              ) : (
                <Typography variant="labelSmall" color="text.secondary">
                  Enter an amount to transfer it to {goal.backing_bank_label ?? 'the backing account'} via UPI, then
                  record it here.
                </Typography>
              )}
            </>
          )}

          {isMfBacked && nav === null && (
            <Alert severity="warning">
              Couldn&apos;t fetch the latest NAV for {goal.backing_mf_scheme_name ?? 'this fund'} — try again in a
              moment.
            </Alert>
          )}

          {isMfBacked && nav !== null && (
            <TextField
              label="Units purchased"
              type="text"
              value={unitsDisplay}
              onChange={(event) => {
                const next = event.target.value
                if (/^[0-9]*\.?[0-9]*$/.test(next)) setUnitsDisplay(next)
              }}
              placeholder={estimatedUnits > 0 ? String(estimatedUnits) : undefined}
              slotProps={{ input: { inputMode: 'decimal' } }}
              helperText={`≈ ${estimatedUnits} units at NAV ${formatINR(Math.round(nav * 100))} — adjust to the units your order actually filled`}
            />
          )}

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
