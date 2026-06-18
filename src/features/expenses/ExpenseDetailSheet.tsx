import { useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Dialog,
  Drawer,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material'
import { formatINR } from '@/lib/currency'
import { formatRelativeDate } from '@/lib/dates'
import { useBackButton } from '@/hooks/useBackButton'
import { AddExpenseSheet } from './AddExpenseSheet'
import { useDeleteExpense } from './useExpenses'
import type { ExpenseFormValues } from './expenseSchema'
import type { Category, ExpenseWithRelations } from '@/types/app'

export interface ExpenseDetailSheetProps {
  /** Whether the detail sheet is open. */
  open: boolean
  /** Called when the sheet should close. */
  onClose: () => void
  /** Expense to display, including its joined category and payer profile. */
  expense: ExpenseWithRelations
  /** All categories for the household, passed through to the edit sheet. */
  categories: Category[]
  /** Household id the expense belongs to. */
  householdId: string
  /** "YYYY-MM" month the parent list is showing, needed for delete cache invalidation. */
  month: string
}

/** Bottom sheet showing full expense detail, with edit and delete actions. */
export function ExpenseDetailSheet({
  open,
  onClose,
  expense,
  categories,
  householdId,
  month,
}: ExpenseDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const deleteExpense = useDeleteExpense()

  useBackButton(open, onClose)

  const handleDelete = () => {
    deleteExpense.mutate(
      { id: expense.id, householdId, month },
      { onSuccess: () => { setConfirmOpen(false); onClose() } }
    )
  }

  const initialValues: Partial<ExpenseFormValues> = {
    amount: expense.amount,
    categoryId: expense.category_id,
    date: expense.date,
    paidBy: expense.paid_by,
    owner: expense.owner,
    personalUserId: expense.personal_user_id,
    splitType: expense.split_type,
    splitPctA: expense.split_pct_a,
    description: expense.description,
    notes: expense.notes,
    isRecurring: expense.is_recurring,
    receiptUrl: expense.receipt_url,
  }

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            borderRadius: { xs: '28px 28px 0 0', sm: '28px' },
            width: '100%',
            maxWidth: { sm: 480 },
            mx: 'auto',
            marginBottom: { sm: 'env(safe-area-inset-bottom)' },
          },
        }}
      >
        <Box sx={{ p: 2.5, paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <Typography variant="headlineSmall">{formatINR(expense.amount)}</Typography>
          <Typography variant="bodyLarge" sx={{ mt: 0.5 }}>
            {expense.description}
          </Typography>
          <Typography variant="bodyMedium" color="text.secondary">
            {formatRelativeDate(expense.date)}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
            <Avatar src={expense.payer.avatar_url ?? undefined} sx={{ width: 24, height: 24 }}>
              {expense.payer.display_name[0]}
            </Avatar>
            <Typography variant="bodyMedium">Paid by {expense.payer.display_name}</Typography>
          </Stack>

          {expense.category && (
            <Typography variant="bodyMedium" sx={{ mt: 1 }}>
              {expense.category.icon} {expense.category.name}
            </Typography>
          )}

          {expense.notes && (
            <Typography variant="bodyMedium" color="text.secondary" sx={{ mt: 1 }}>
              {expense.notes}
            </Typography>
          )}

          {expense.receipt_url && (
            <Box
              component="img"
              src={expense.receipt_url}
              alt="Receipt"
              onClick={() => setReceiptOpen(true)}
              sx={{ mt: 2, width: 96, height: 96, objectFit: 'cover', borderRadius: 2, cursor: 'pointer' }}
            />
          )}

          <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
            <Button variant="outlined" fullWidth onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button variant="outlined" color="error" fullWidth onClick={() => setConfirmOpen(true)}>
              Delete
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {expense.receipt_url && (
        <Dialog fullScreen open={receiptOpen} onClose={() => setReceiptOpen(false)}>
          <Box
            component="img"
            src={expense.receipt_url}
            alt="Receipt full size"
            onClick={() => setReceiptOpen(false)}
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </Dialog>
      )}

      <AddExpenseSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        categories={categories}
        initialValues={initialValues}
        expenseId={expense.id}
      />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <Box sx={{ p: 3, maxWidth: 320 }}>
          <Typography variant="titleMedium">Delete this expense?</Typography>
          <Typography variant="bodyMedium" color="text.secondary" sx={{ mt: 1 }}>
            This can&apos;t be undone.
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
            <Button fullWidth onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={deleteExpense.isPending}
            >
              {deleteExpense.isPending ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
            </Button>
          </Stack>
        </Box>
      </Dialog>
    </>
  )
}
