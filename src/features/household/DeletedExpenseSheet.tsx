import { Box, Button, Chip, CircularProgress, Drawer, Stack, Typography } from '@mui/material'
import RestoreIcon from '@mui/icons-material/Restore'
import { useSnackbar } from 'notistack'
import { formatINR } from '@/lib/currency'
import { formatRelativeDate } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { useBackButton } from '@/hooks/useBackButton'
import { useCategories } from '@/hooks/useCategories'
import { useHouseholdMembers } from '@/features/auth/useHouseholdMembers'
import { useRestoreExpense } from '@/features/expenses/useExpenses'
import { CategoryIcon } from '@/components/CategoryIcon'
import { getDeletedExpenseSnapshot } from './deletedExpense'
import type { AuditLogEntry } from '@/types/app'

export interface DeletedExpenseSheetProps {
  /** Whether the sheet is open. */
  open: boolean
  /** Called when the sheet should close. */
  onClose: () => void
  /** The deletion audit entry whose snapshot should be shown. */
  entry: AuditLogEntry
  /** Household the entry belongs to, used to resolve category and payer names. */
  householdId: string
}

/**
 * Detail view for a deleted-expense activity entry. Deletion is permanent
 * (the row is hard-deleted), so this reads the snapshot the audit log captured
 * at delete time to show what the expense was and offers a one-tap restore that
 * re-inserts it. Falls back to a can't-restore notice for older deletions that
 * predate snapshot capture.
 */
export function DeletedExpenseSheet({ open, onClose, entry, householdId }: DeletedExpenseSheetProps) {
  const { enqueueSnackbar } = useSnackbar()
  const restoreExpense = useRestoreExpense()
  const { data: categories } = useCategories(householdId)
  const { data: members } = useHouseholdMembers(householdId)

  useBackButton(open, onClose)

  const snapshot = getDeletedExpenseSnapshot(entry)
  const category = snapshot?.category_id
    ? categories?.find((c) => c.id === snapshot.category_id) ?? null
    : null
  const payer = snapshot?.paid_by
    ? members?.find((m) => m.profile.id === snapshot.paid_by)?.profile ?? null
    : null

  const handleRestore = () => {
    if (!snapshot) return
    restoreExpense.mutate(
      { snapshot },
      {
        onSuccess: () => {
          enqueueSnackbar('Expense restored', { variant: 'success' })
          onClose()
        },
        onError: (error) => {
          // A unique-violation means the snapshot's id already exists — the
          // expense was restored already. Anything else is surfaced verbatim.
          const message = errorMessage(error, 'Could not restore expense')
          enqueueSnackbar(
            /duplicate key|already exists/i.test(message)
              ? 'This expense has already been restored'
              : message,
            { variant: 'error' }
          )
        },
      }
    )
  }

  return (
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
        <Chip label="Deleted" color="error" size="small" variant="outlined" sx={{ mb: 1.5 }} />

        {snapshot ? (
          <>
            <Typography variant="headlineSmall">{formatINR(snapshot.amount)}</Typography>
            <Typography variant="bodyLarge" sx={{ mt: 0.5 }}>
              {snapshot.description}
            </Typography>
            <Typography variant="bodyMedium" color="text.secondary">
              {formatRelativeDate(snapshot.date)}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
              <Typography variant="bodyMedium">
                Paid by {payer?.display_name ?? 'Unknown'}
              </Typography>
            </Stack>

            {category && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
                <CategoryIcon icon={category.icon} fontSize="small" sx={{ color: category.color }} />
                <Typography variant="bodyMedium">{category.name}</Typography>
              </Stack>
            )}

            {snapshot.notes && (
              <Typography variant="bodyMedium" color="text.secondary" sx={{ mt: 1 }}>
                {snapshot.notes}
              </Typography>
            )}

            <Typography variant="bodySmall" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              This expense was deleted. Restoring adds it back to your expenses.
            </Typography>

            <Button
              variant="contained"
              fullWidth
              startIcon={restoreExpense.isPending ? undefined : <RestoreIcon />}
              onClick={handleRestore}
              disabled={restoreExpense.isPending}
              sx={{ mt: 3 }}
            >
              {restoreExpense.isPending ? <CircularProgress size={20} color="inherit" /> : 'Restore'}
            </Button>
          </>
        ) : (
          <>
            <Typography variant="titleMedium">{entry.summary ?? 'Deleted expense'}</Typography>
            <Typography variant="bodyMedium" color="text.secondary" sx={{ mt: 1 }}>
              This expense was deleted before restore was supported, so its details
              weren&apos;t saved and it can&apos;t be restored.
            </Typography>
          </>
        )}
      </Box>
    </Drawer>
  )
}
