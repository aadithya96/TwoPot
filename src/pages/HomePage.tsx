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
import { useExpenses, AddExpenseSheet, ExpenseRow } from '@/features/expenses'
import { useBudgetUsage } from '@/features/budgets/useBudgets'
import { GoalCard, useGoals } from '@/features/goals'
import { SettlementCard } from '@/features/settlement'

/**
 * Dashboard: current-month spend summary, member contribution chips, settlement card,
 * budget alerts, the last 5 expenses, a horizontal goals row, and a FAB to add an expense.
 */
export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const householdId = useHouseholdStore((state) => state.householdId)
  const members = useHouseholdStore((state) => state.members)
  const month = monthKey()

  const { data: expenses, isLoading: isExpensesLoading } = useExpenses(householdId ?? undefined, month)
  const { data: budgetUsage } = useBudgetUsage(householdId ?? undefined)

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsAddOpen(true)
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

      {householdId && hasSharedExpenses && <SettlementCard householdId={householdId} periodMonth={month} />}

      {budgetAlerts.length > 0 && (
        <Stack spacing={1}>
          {budgetAlerts
            .filter((row) => !dismissedAlerts.has(row.category_id))
            .map((row) => (
              <Alert
                key={row.category_id}
                severity={row.spent_amount >= row.budget_amount ? 'error' : 'warning'}
                onClose={() =>
                  setDismissedAlerts((prev) => new Set(prev).add(row.category_id))
                }
              >
                {row.category_name}: {formatINR(row.spent_amount)} of {formatINR(row.budget_amount)} spent
              </Alert>
            ))}
        </Stack>
      )}

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
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
              <ExpenseRow key={expense.id} expense={expense} condensed />
            ))}
          </Stack>
        )}
      </Box>

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="titleMedium">Goals</Typography>
          <Link component={RouterLink} to="/goals" variant="labelLarge">
            See all
          </Link>
        </Stack>
        <GoalsRow householdId={householdId} />
      </Box>

      <Fab
        color="primary"
        aria-label="Add expense"
        onClick={() => setIsAddOpen(true)}
        sx={{ position: 'fixed', bottom: 88, right: 16 }}
      >
        <AddOutlinedIcon />
      </Fab>

      {householdId && (
        <AddExpenseSheet open={isAddOpen} onClose={() => setIsAddOpen(false)} householdId={householdId} />
      )}
    </Box>
  )
}

/** Horizontal-scroll strip of compact goal cards for the dashboard, isolated so its hook usage stays optional. */
function GoalsRow({ householdId }: { householdId: string | null }) {
  const { data: goals, isLoading } = useGoals(householdId ?? undefined)

  if (isLoading) {
    return (
      <Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: 'auto' }}>
        {[0, 1].map((i) => (
          <Skeleton key={i} variant="rounded" width={160} height={100} />
        ))}
      </Stack>
    )
  }

  if (!goals || goals.length === 0) {
    return (
      <Typography variant="bodyMedium" color="text.secondary" sx={{ mt: 1 }}>
        No savings goals yet.
      </Typography>
    )
  }

  return (
    <Stack direction="row" spacing={1.5} sx={{ mt: 1, overflowX: 'auto', pb: 1 }}>
      {goals.map((goal) => (
        <Box key={goal.id} sx={{ minWidth: 160 }}>
          <GoalCard goal={goal} compact />
        </Box>
      ))}
    </Stack>
  )
}

