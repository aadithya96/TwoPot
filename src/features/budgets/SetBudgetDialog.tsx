import { useEffect, useState } from 'react'
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { fromStorageAmount, toStorageAmount } from '@/lib/currency'
import type { Budget, BudgetUsage, Category } from '@/types/app'
import { useSetBudget } from './useBudgets'

export interface SetBudgetDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close. */
  onClose: () => void
  /** Household the budget belongs to. */
  householdId: string
  /** Categories available to choose from when no category is pre-filled. */
  categories: Category[]
  /** Pre-filled usage row when opened from a specific category's row; omit to let the user pick a category. */
  initialUsage?: BudgetUsage
  /** Budget period to set; defaults to 'monthly'. */
  period?: Budget['period']
}

/** Dialog for creating or updating a household's budget amount and rollover setting for a category. */
export function SetBudgetDialog({
  open,
  onClose,
  householdId,
  categories,
  initialUsage,
  period = 'monthly',
}: SetBudgetDialogProps) {
  const [categoryId, setCategoryId] = useState(initialUsage?.category_id ?? '')
  const [amountDisplay, setAmountDisplay] = useState(
    initialUsage ? String(fromStorageAmount(initialUsage.budget_amount)) : ''
  )
  const [rollover, setRollover] = useState(false)
  const setBudget = useSetBudget()

  useEffect(() => {
    if (open) {
      setCategoryId(initialUsage?.category_id ?? '')
      setAmountDisplay(initialUsage ? String(fromStorageAmount(initialUsage.budget_amount)) : '')
      setRollover(false)
    }
  }, [open, initialUsage])

  const handleSave = async () => {
    if (!categoryId) return
    await setBudget.mutateAsync({
      householdId,
      categoryId,
      amount: toStorageAmount(amountDisplay),
      period,
      rollover,
    })
    onClose()
  }

  const isValid = Boolean(categoryId) && toStorageAmount(amountDisplay) > 0

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Set budget</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!initialUsage && (
            <TextField
              select
              label="Category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="Budget amount"
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
          <FormControlLabel
            control={<Switch checked={rollover} onChange={(event) => setRollover(event.target.checked)} />}
            label="Roll over unused budget to next period"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!isValid || setBudget.isPending}
          onClick={handleSave}
          startIcon={setBudget.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
