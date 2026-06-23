import { useState } from 'react'
import { Avatar, Box, Chip, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { formatINR } from '@/lib/currency'
import { formatRelativeDate } from '@/lib/dates'
import { useSwipeToDelete } from '@/hooks/useSwipeToDelete'
import { ExpenseDetailSheet } from './ExpenseDetailSheet'
import { useDeleteExpense } from './useExpenses'
import type { ExpenseWithRelations } from '@/types/app'
import type { Category } from '@/types/app'

export interface ExpenseRowProps {
  /** Expense to render, including its joined category and payer profile. */
  expense: ExpenseWithRelations
  /** Id of the user currently viewing the list, used to highlight their own personal expenses. */
  currentUserId: string
  /** Household id the expense belongs to, needed for delete cache invalidation. */
  householdId: string
  /** "YYYY-MM" month the row's parent list is showing, needed for delete cache invalidation. */
  month: string
  /** All categories for the household, passed through to the edit sheet. */
  categories: Category[]
}

function splitLabel(expense: ExpenseWithRelations): string | null {
  if (expense.owner !== 'shared') return null
  if (expense.split_type === 'equal') return '50/50'
  if (expense.split_type === 'payer_covers') return "Payer covers"
  if (expense.split_type === 'custom' && expense.split_pct_a !== null) return `You ${expense.split_pct_a}%`
  return null
}

/** Single swipeable expense row; tapping opens the detail sheet, swiping left reveals delete. */
export function ExpenseRow({ expense, currentUserId, householdId, month, categories }: ExpenseRowProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const deleteExpense = useDeleteExpense()

  const { ref, offsetX, isRevealed } = useSwipeToDelete(() => {
    deleteExpense.mutate({ id: expense.id, householdId, month })
  })

  const isOwnPersonalExpense = expense.owner === 'personal' && expense.personal_user_id === currentUserId
  const badge = splitLabel(expense)

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }}>
      {isRevealed && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            pr: 2,
            backgroundColor: 'error.main',
            color: 'error.contrastText',
          }}
        >
          <DeleteIcon />
        </Box>
      )}
      <Box
        ref={ref}
        onClick={() => setDetailOpen(true)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 1.5,
          px: 2,
          backgroundColor: 'background.paper',
          transform: `translateX(${offsetX}px)`,
          touchAction: 'pan-y',
          cursor: 'pointer',
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: expense.category?.color ?? 'grey.400',
            flexShrink: 0,
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="bodyLarge" noWrap>
            {expense.description}
          </Typography>
          <Typography variant="bodySmall" color="text.secondary">
            {formatRelativeDate(expense.date)}
          </Typography>
        </Box>
        {badge && <Chip size="small" label={badge} />}
        <Typography
          variant="titleMedium"
          sx={{ color: isOwnPersonalExpense ? 'error.main' : 'text.primary', flexShrink: 0 }}
        >
          {formatINR(expense.amount)}
        </Typography>
        <Avatar
          src={expense.payer?.avatar_url ?? undefined}
          alt={expense.payer?.display_name ?? ''}
          sx={{ width: 28, height: 28, flexShrink: 0 }}
        >
          {expense.payer?.display_name?.[0] ?? '?'}
        </Avatar>
      </Box>

      <ExpenseDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        expense={expense}
        categories={categories}
        householdId={householdId}
        month={month}
      />
    </Box>
  )
}
