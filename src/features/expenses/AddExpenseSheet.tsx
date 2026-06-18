import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Drawer,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  CircularProgress,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { AmountField, CategoryPicker, SplitSelector } from '@/components/forms'
import { expenseSchema, type ExpenseFormValues } from './expenseSchema'
import { useAddExpense, useUpdateExpense } from './useExpenses'
import { useScanReceipt } from './useScanReceipt'
import { ReceiptUploader } from './ReceiptUploader'
import { useBackButton } from '@/hooks/useBackButton'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import { useHouseholdStore } from '@/stores/householdStore'
import type { Category } from '@/types/app'

export interface AddExpenseSheetProps {
  /** Whether the sheet is open. */
  open: boolean
  /** Called when the sheet should close (cancel, back button, or after successful save). */
  onClose: () => void
  /** Categories available for the current household, passed to the CategoryPicker. */
  categories: Category[]
  /** Pre-filled values when editing an existing expense; omit for a new expense. */
  initialValues?: Partial<ExpenseFormValues>
  /** Id of the expense being edited; omit (or undefined) when creating a new expense. */
  expenseId?: string
}

const DEFAULT_VALUES: ExpenseFormValues = {
  amount: 0,
  categoryId: null,
  date: new Date().toISOString().slice(0, 10),
  paidBy: '',
  owner: 'shared',
  personalUserId: null,
  splitType: 'equal',
  splitPctA: null,
  description: '',
  notes: null,
  isRecurring: false,
  receiptUrl: null,
}

/** Bottom-sheet form for creating or editing an expense, using React Hook Form + Zod validation. */
export function AddExpenseSheet({ open, onClose, categories, initialValues, expenseId }: AddExpenseSheetProps) {
  const householdId = useHouseholdStore((state) => state.householdId)
  const members = useHouseholdStore((state) => state.members)
  const { height: viewportHeight } = useVisualViewport()
  const addExpense = useAddExpense()
  const updateExpense = useUpdateExpense()
  const scanReceipt = useScanReceipt()
  const { enqueueSnackbar } = useSnackbar()

  useBackButton(open, onClose)

  const { control, handleSubmit, watch, reset, getValues, setValue } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { ...DEFAULT_VALUES, ...initialValues },
  })

  const owner = watch('owner')

  // Scan a freshly uploaded receipt and prefill only fields the user hasn't
  // already set, so it never overwrites manual input. Failures are non-fatal —
  // the photo stays attached and the form can be completed by hand.
  const scanAndPrefill = async (receiptUrl: string) => {
    try {
      const result = await scanReceipt.mutateAsync(receiptUrl)
      const filled: string[] = []
      if (result.amountRupees && getValues('amount') === 0) {
        setValue('amount', Math.round(result.amountRupees * 100), { shouldValidate: true })
        filled.push('amount')
      }
      if (result.date) {
        setValue('date', result.date, { shouldValidate: true })
        filled.push('date')
      }
      if (result.merchant && !getValues('description')?.trim()) {
        setValue('description', result.merchant, { shouldValidate: true })
        filled.push('description')
      }
      enqueueSnackbar(
        filled.length > 0 ? `Filled ${filled.join(', ')} from receipt` : 'No details found on receipt',
        { variant: filled.length > 0 ? 'success' : 'info' }
      )
    } catch {
      enqueueSnackbar('Could not scan receipt — enter details manually', { variant: 'warning' })
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!householdId) return
    const month = values.date.slice(0, 7)

    if (expenseId) {
      await updateExpense.mutateAsync({ id: expenseId, householdId, ...values })
    } else {
      await addExpense.mutateAsync({ householdId, ...values })
    }
    void month
    reset(DEFAULT_VALUES)
    onClose()
  })

  const isPending = addExpense.isPending || updateExpense.isPending

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          borderRadius: '28px 28px 0 0',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
          maxHeight: viewportHeight ? `${viewportHeight - 16}px` : '90vh',
        },
      }}
    >
      <Box component="form" onSubmit={onSubmit} sx={{ p: 2, overflowY: 'auto' }}>
        <Typography variant="titleLarge" sx={{ mb: 2 }}>
          {expenseId ? 'Edit expense' : 'Add expense'}
        </Typography>

        <Stack spacing={2.5}>
          <Controller
            name="amount"
            control={control}
            render={({ field, fieldState }) => (
              <AmountField
                value={field.value}
                onChange={field.onChange}
                label="Amount"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ input: { sx: { fontSize: '2rem' } } }}
              />
            )}
          />

          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <CategoryPicker categories={categories} value={field.value} onChange={field.onChange} />
            )}
          />

          <Controller
            name="date"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="date"
                label="Date"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          />

          <Box>
            <Typography variant="labelLarge" sx={{ mb: 1, display: 'block' }}>
              Receipt
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Controller
                name="receiptUrl"
                control={control}
                render={({ field }) => (
                  <ReceiptUploader
                    value={field.value}
                    onChange={(url) => {
                      field.onChange(url)
                      if (url) void scanAndPrefill(url)
                    }}
                  />
                )}
              />
              {scanReceipt.isPending && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <CircularProgress size={16} />
                  <Typography variant="bodyMedium" color="text.secondary">
                    Scanning receipt…
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>

          <Box>
            <Typography variant="labelLarge" sx={{ mb: 1, display: 'block' }}>
              Who paid?
            </Typography>
            <Controller
              name="paidBy"
              control={control}
              render={({ field }) => (
                <Stack direction="row" spacing={1}>
                  {members.map((member) => (
                    <Chip
                      key={member.id}
                      avatar={<Avatar src={member.avatar_url ?? undefined}>{member.display_name[0]}</Avatar>}
                      label={member.display_name}
                      onClick={() => field.onChange(member.id)}
                      variant={field.value === member.id ? 'filled' : 'outlined'}
                      color={field.value === member.id ? 'primary' : 'default'}
                    />
                  ))}
                </Stack>
              )}
            />
          </Box>

          <Controller
            name="owner"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                value={field.value}
                exclusive
                fullWidth
                color="primary"
                onChange={(_event, next: 'shared' | 'personal' | null) => next && field.onChange(next)}
              >
                <ToggleButton value="shared">Shared</ToggleButton>
                <ToggleButton value="personal">Personal</ToggleButton>
              </ToggleButtonGroup>
            )}
          />

          <Collapse in={owner === 'personal'}>
            <Controller
              name="personalUserId"
              control={control}
              render={({ field }) => (
                <Stack direction="row" spacing={1}>
                  {members.map((member) => (
                    <Chip
                      key={member.id}
                      label={member.display_name}
                      onClick={() => field.onChange(member.id)}
                      variant={field.value === member.id ? 'filled' : 'outlined'}
                      color={field.value === member.id ? 'primary' : 'default'}
                    />
                  ))}
                </Stack>
              )}
            />
          </Collapse>

          <Collapse in={owner === 'shared'}>
            <Controller
              name="splitType"
              control={control}
              render={({ field: splitTypeField }) => (
                <Controller
                  name="splitPctA"
                  control={control}
                  render={({ field: splitPctField }) => (
                    <SplitSelector
                      value={{ type: splitTypeField.value, splitPctA: splitPctField.value ?? undefined }}
                      onChange={(next) => {
                        splitTypeField.onChange(next.type)
                        splitPctField.onChange(next.splitPctA ?? null)
                      }}
                    />
                  )}
                />
              )}
            />
          </Collapse>

          <Controller
            name="description"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                value={field.value ?? ''}
                label="Description"
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ''}
                onChange={(event) => field.onChange(event.target.value || null)}
                label="Notes"
                multiline
                minRows={2}
              />
            )}
          />

          <Controller
            name="isRecurring"
            control={control}
            render={({ field }) => (
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="bodyLarge">Recurring expense</Typography>
                <Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
              </Stack>
            )}
          />

          <Button type="submit" variant="contained" fullWidth disabled={isPending}>
            {isPending ? <CircularProgress size={20} color="inherit" /> : expenseId ? 'Save changes' : 'Add expense'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
