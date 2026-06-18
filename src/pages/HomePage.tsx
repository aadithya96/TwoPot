import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Avatar,
  Stack,
  Alert,
  Fab,
  Link,
  Skeleton,
} from '@mui/material'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import { useHouseholdStore } from '@/stores/householdStore'
import { formatMonth, monthKey } from '@/lib/dates'
import { formatINR } from '@/lib/currency'
import { useCategories } from '@/hooks/useCategories'
import { useExpenses, AddExpenseSheet, ExpenseRow } from '@/features/expenses'
import { useBudgetUsage } from '@/features/budgets'
import { GoalCard, useGoals } from '@/features/goals'
import { SettlementCard, useIsSettled, useSettlement } from '@/features/settlement'
import { useCurrentUser } from '@/features/auth'

/**
 * Dashboard: current-month spend summary, member contribution chips, settlement card,
 * budget alerts, the last 5 expenses, a horizontal goals row, and a FAB to add an expense.
 */
export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isAddOpen, setIsAddOpen] = useState(() => searchParams.get('action') === 'add')
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const householdId = useHouseholdStore((state) => state.householdId)
  const members = useHouseholdStore((state) => state.members)
  const month = monthKey()

  const { data: currentUser } = useCurrentUser()
  const { data: expenses, isLoading: isExpensesLoading } = useExpenses(householdId ?? undefined, month)
  const { data: budgetUsage } = useBudgetUsage(householdId ?? undefined)
  const { data: categories } = useCategories(householdId ?? undefined)
  const { data: goals, isLoading: isGoalsLoading } = useGoals(householdId ?? undefined)
  const { data: settlement } = useSettlement(householdId ?? undefined, month)
  const { data: isSettled } = useIsSettled(householdId ?? undefined, month)

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  const totalSpend = useMemo(
    () => (expenses ?? []).reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  )

  const totalBudget = useMemo(
    () => (budgetUsage ?? []).reduce((sum, row) => sum + row.budget_amount, 0),
    [budgetUsage]
  )

  const contributionsByMember = useMemo(() => {
    const totals = new Map<string, number>()
    for (const expense of expenses ?? []) {
      totals.set(expense.paid_by, (totals.get(expense.paid_by) ?? 0) + expense.amount)
    }
    return totals
  }, [expenses])

  const hasSharedExpenses = useMemo(
    () => (expenses ?? []).some((expense) => expense.owner === 'shared'),
    [expenses]
  )

  const budgetAlerts = useMemo(
    () =>
      (budgetUsage ?? []).filter(
        (row) => row.budget_amount > 0 && row.spent_amount / row.budget_amount >= 0.8
      ),
    [budgetUsage]
  )

  const recentExpenses = useMemo(() => (expenses ?? []).slice(0, 5), [expenses])

  return (
    <Box sx={{ p: 2, pb: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Card elevation={1}>
        <CardContent>
          <Typography variant="titleMedium" color="text.secondary">
            {formatMonth(month)}
          </Typography>
          {isExpensesLoading ? (
            <Skeleton variant="text" width={160} height={48} />
          ) : (
            <Typography variant="headlineMedium" sx={{ mt: 0.5 }}>
              {formatINR(totalSpend)}
            </Typography>
          )}
          {totalBudget > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (totalSpend / totalBudget) * 100)}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="labelSmall" color="text.secondary" sx={{ mt: 0.5 }}>
                {formatINR(totalSpend)} of {formatINR(totalBudget)} budgeted
              </Typography>
            </Box>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            {members.map((member) => (
              <Chip
                key={member.id}
                avatar={<Avatar src={member.avatar_url ?? undefined}>{member.display_name[0]}</Avatar>}
                label={formatINR(contributionsByMember.get(member.id) ?? 0)}
                variant="outlined"
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {householdId && hasSharedExpenses && (
        <SettlementCard
          settlement={settlement ?? null}
          members={members}
          householdId={householdId}
          periodMonth={month}
          isSettled={isSettled ?? false}
        />
      )}

      {budgetAlerts.length > 0 && (
        <Stack spacing={1}>
          {budgetAlerts
            .filter((row) => !dismissedAlerts.has(row.category_id))
            .map((row) => (
              <Alert
                key={row.category_id}
                severity={row.spent_amount >= row.budget_amount ? 'error' : 'warning'}
                onClose={() => setDismissedAlerts((prev) => new Set(prev).add(row.category_id))}
              >
                {row.category_name}: {formatINR(row.spent_amount)} of {formatINR(row.budget_amount)} spent
              </Alert>
            ))}
        </Stack>
      )}

      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="titleMedium">Recent expenses</Typography>
          <Link component={RouterLink} to="/expenses" variant="labelLarge">
            See all
          </Link>
        </Stack>
        {isExpensesLoading ? (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={56} />
            ))}
          </Stack>
        ) : recentExpenses.length === 0 ? (
          <Typography variant="bodyMedium" color="text.secondary" sx={{ mt: 1 }}>
            No expenses yet this month.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {recentExpenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                currentUserId={currentUser?.id ?? ''}
                householdId={householdId ?? ''}
                month={month}
                categories={categories ?? []}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="titleMedium">Goals</Typography>
          <Link component={RouterLink} to="/goals" variant="labelLarge">
            See all
          </Link>
        </Stack>
        {isGoalsLoading ? (
          <Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: 'auto' }}>
            {[0, 1].map((i) => (
              <Skeleton key={i} variant="rounded" width={200} height={160} />
            ))}
          </Stack>
        ) : !goals || goals.length === 0 ? (
          <Typography variant="bodyMedium" color="text.secondary" sx={{ mt: 1 }}>
            No savings goals yet.
          </Typography>
        ) : (
          <Stack direction="row" spacing={1.5} sx={{ mt: 1, overflowX: 'auto', pb: 1 }}>
            {goals.map((goal) => (
              <Box key={goal.id} sx={{ minWidth: 220 }}>
                <GoalCard goal={goal} members={members} />
              </Box>
            ))}
          </Stack>
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
