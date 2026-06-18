import { useState } from 'react'
import { Box, Tabs, Tab, Fab, Skeleton } from '@mui/material'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import { useHouseholdStore } from '@/stores/householdStore'
import { useCategories } from '@/hooks/useCategories'
import { ExpenseList, RecurringList, AddExpenseSheet } from '@/features/expenses'
import { useCurrentUser } from '@/features/auth'

type ExpensesTab = 'all' | 'recurring'

/** Expenses screen: toggles between the full expense list and the recurring-expenses view, with an add FAB. */
export function ExpensesPage() {
  const [tab, setTab] = useState<ExpensesTab>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const householdId = useHouseholdStore((state) => state.householdId)
  const { data: currentUser } = useCurrentUser()
  const { data: categories, isLoading } = useCategories(householdId ?? undefined)

  if (!householdId || isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rounded" height={300} />
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 12 }}>
      <Tabs value={tab} onChange={(_event, value: ExpensesTab) => setTab(value)} sx={{ px: 2 }}>
        <Tab label="All expenses" value="all" />
        <Tab label="Recurring" value="recurring" />
      </Tabs>

      <Box sx={{ p: 2 }}>
        {tab === 'all' ? (
          <ExpenseList
            householdId={householdId}
            currentUserId={currentUser?.id ?? ''}
            categories={categories ?? []}
          />
        ) : (
          <RecurringList householdId={householdId} />
        )}
      </Box>

      <Fab
        color="primary"
        aria-label="Add expense"
        onClick={() => setIsAddOpen(true)}
        sx={{ position: 'fixed', bottom: 88, right: 16 }}
      >
        <AddOutlinedIcon />
      </Fab>

      <AddExpenseSheet
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        categories={categories ?? []}
      />
    </Box>
  )
}
