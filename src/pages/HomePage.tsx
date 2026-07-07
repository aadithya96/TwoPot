import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom'
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
import { useExpenses } from '@/features/expenses/useExpenses'
import { ExpenseRow } from '@/features/expenses/ExpenseRow'
import { useBudgetUsage } from '@/features/budgets'
import { GoalCard, useGoals } from '@/features/goals'
import { useBalanceTrend } from '@/features/settlement/useSettlement'
import { usePotConfig } from '@/features/pots/usePots'
import { useCurrentUser } from '@/features/auth'
import { HomeTasksSection } from '@/features/tasks'
import { SetupChecklist, type SetupStep } from '@/features/home/SetupChecklist'
import { SETUP_DISMISSED_KEY } from '@/lib/storageKeys'
import { lazyWithRetry } from '@/lib/lazyWithRetry'

// Heavy or below-the-fold sections are code-split so they stay out of the
// initial Home bundle. SettlementSection pulled in the settlement barrel (incl.
// recharts) and AddExpenseSheet only renders on demand from the FAB.
const SettlementSection = lazyWithRetry(() =>
  import('@/features/settlement/SettlementSection').then((m) => ({ default: m.SettlementSection }))
)
const PotsOverview = lazyWithRetry(() =>
  import('@/features/pots/PotsOverview').then((m) => ({ default: m.PotsOverview }))
)
const ActivityFeed = lazyWithRetry(() =>
  import('@/features/household/ActivityFeed').then((m) => ({ default: m.ActivityFeed }))
)
const AddExpenseSheet = lazyWithRetry(() =>
  import('@/features/expenses/AddExpenseSheet').then((m) => ({ default: m.AddExpenseSheet }))
)

/**
 * Dashboard: current-month spend summary, member contribution chips, settlement card,
 * budget alerts, the last 5 expenses, a horizontal goals row, and a FAB to add an expense.
 */
export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isAddOpen, setIsAddOpen] = useState(() => searchParams.get('action') === 'add')
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [isSetupDismissed, setIsSetupDismissed] = useState(
    () => localStorage.getItem(SETUP_DISMISSED_KEY) === '1'
  )

  const householdId = useHouseholdStore((state) => state.householdId)
  const members = useHouseholdStore((state) => state.members)
  const month = monthKey()

  const { data: currentUser } = useCurrentUser()
  const { data: expenses, isLoading: isExpensesLoading } = useExpenses(
    householdId ?? undefined,
    month
  )
  const { data: budgetUsage } = useBudgetUsage(householdId ?? undefined)
  const { data: categories } = useCategories(householdId ?? undefined)
  const { data: goals, isLoading: isGoalsLoading } = useGoals(householdId ?? undefined)
  const { data: balanceTrend } = useBalanceTrend(householdId ?? undefined)
  const { data: potConfig, isLoading: isPotConfigLoading } = usePotConfig(householdId ?? undefined)

  // Mirror PotsOverview's own visibility rule so we only reserve layout space
  // (and load its chunk) when the card will actually render — reserving for the
  // disabled-pots case would introduce a shift instead of removing one.
  const showPots = Boolean(potConfig?.enabled && potConfig.members.length >= 2)

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

  // A past month with an unsettled balance should surface the settle-up
  // section even when the current month has no shared expenses yet.
  const hasOutstandingBalance = useMemo(
    () => (balanceTrend ?? []).some((row) => row.outstanding_amount !== 0),
    [balanceTrend]
  )

  const budgetAlerts = useMemo(
    () =>
      (budgetUsage ?? []).filter(
        (row) => row.budget_amount > 0 && row.spent_amount / row.budget_amount >= 0.8
      ),
    [budgetUsage]
  )

  const recentExpenses = useMemo(() => (expenses ?? []).slice(0, 5), [expenses])

  const setupSteps = useMemo<SetupStep[]>(
    () => [
      {
        key: 'expense',
        label: 'Add your first expense',
        description: 'Track what you spend to see it here.',
        done: (expenses?.length ?? 0) > 0,
        actionLabel: 'Add',
        onAction: () => setIsAddOpen(true),
      },
      {
        key: 'budget',
        label: 'Set a budget',
        description: 'Cap spending per category and get alerts.',
        done: (budgetUsage ?? []).some((row) => row.budget_amount > 0),
        actionLabel: 'Set up',
        onAction: () => navigate('/budgets'),
      },
      {
        key: 'goal',
        label: 'Create a savings goal',
        description: 'Save towards something together.',
        done: (goals?.length ?? 0) > 0,
        actionLabel: 'Create',
        onAction: () => navigate('/goals'),
      },
      {
        key: 'partner',
        label: 'Invite your partner',
        description: 'Share expenses, budgets, and goals.',
        done: members.length > 1,
        actionLabel: 'Invite',
        onAction: () => navigate('/settings/household'),
      },
    ],
    [expenses, budgetUsage, goals, members, navigate]
  )

  const isSetupComplete = setupSteps.every((step) => step.done)
  const showSetup = !isSetupDismissed && !isSetupComplete

  const dismissSetup = () => {
    localStorage.setItem(SETUP_DISMISSED_KEY, '1')
    setIsSetupDismissed(true)
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 0 },
        pt: { md: 3 },
        pb: { xs: 12, md: 0 },
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, md: 3 },
      }}
    >
      {showSetup && <SetupChecklist steps={setupSteps} onDismiss={dismissSetup} />}

      <Card elevation={1}>
        <CardContent>
          <Typography variant="titleMedium" color="text.secondary">
            {formatMonth(month)}
          </Typography>
          {isExpensesLoading ? (
            <Skeleton variant="text" width={160} height={48} />
          ) : (
            <Typography variant="headlineMedium" component="p" sx={{ mt: 0.5 }}>
              {formatINR(totalSpend)}
            </Typography>
          )}
          {totalBudget > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (totalSpend / totalBudget) * 100)}
                aria-label={`Spent ${formatINR(totalSpend)} of ${formatINR(totalBudget)} budget`}
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
                avatar={
                  <Avatar src={member.avatar_url ?? undefined} alt={member.display_name}>
                    {member.display_name[0]}
                  </Avatar>
                }
                label={formatINR(contributionsByMember.get(member.id) ?? 0)}
                variant="outlined"
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* The settlement and two-pots cards sit above the "Recent expenses" grid,
          so when they appear after their data loads they push the grid down and
          dominate CLS. We reserve their slots from the first render — while the
          gating query (expenses / pot config) is still loading — and hold the
          reserved height until the card's own data is ready, so the card drops
          in at its final height without moving the grid. The same slots are
          reserved in <AppShellSkeleton>, so the layout is stable from the
          initial HTML all the way through to loaded content. Trade-off: a
          household with no shared expenses or with pots disabled briefly shows a
          reserved slot that then collapses — acceptable for an app where shared
          expenses and pots are the primary, near-universal cases. */}
      {householdId &&
        (isExpensesLoading ? (
          <Skeleton variant="rounded" height={200} />
        ) : (
          (hasSharedExpenses || hasOutstandingBalance) && (
            <Suspense fallback={<Skeleton variant="rounded" height={200} />}>
              <SettlementSection
                householdId={householdId}
                members={members}
                currentUserId={currentUser?.id}
              />
            </Suspense>
          )
        ))}

      {householdId &&
        (isPotConfigLoading ? (
          <Skeleton variant="rounded" height={240} />
        ) : (
          showPots && (
            <Suspense fallback={<Skeleton variant="rounded" height={240} />}>
              <PotsOverview householdId={householdId} month={month} />
            </Suspense>
          )
        ))}

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
                {row.category_name}: {formatINR(row.spent_amount)} of {formatINR(row.budget_amount)}{' '}
                spent
              </Alert>
            ))}
        </Stack>
      )}

      {householdId && currentUser && (
        <HomeTasksSection householdId={householdId} userId={currentUser.id} members={members} />
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}
      >
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

        {/* minWidth: 0 keeps the horizontally-scrolling goals row from widening
          this grid track (grid items default to min-width: auto), which made
          the whole page scroll sideways instead of just the row. */}
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant="titleMedium">Goals</Typography>
            <Link component={RouterLink} to="/goals" variant="labelLarge">
              See all
            </Link>
          </Stack>
          {isGoalsLoading ? (
            <Stack
              direction={{ xs: 'row', md: 'column' }}
              spacing={1.5}
              sx={{ mt: 1, overflowX: { xs: 'auto', md: 'visible' } }}
            >
              {[0, 1].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={160}
                  sx={{ width: { xs: 200, md: '100%' }, flexShrink: 0 }}
                />
              ))}
            </Stack>
          ) : !goals || goals.length === 0 ? (
            <Typography variant="bodyMedium" color="text.secondary" sx={{ mt: 1 }}>
              No savings goals yet.
            </Typography>
          ) : (
            <Stack
              direction={{ xs: 'row', md: 'column' }}
              spacing={1.5}
              sx={{
                mt: 1,
                overflowX: { xs: 'auto', md: 'visible' },
                pb: { xs: 1, md: 0 },
              }}
            >
              {goals.map((goal) => (
                <Box
                  key={goal.id}
                  sx={{ minWidth: { xs: 220, md: 0 }, width: { md: '100%' }, flexShrink: 0 }}
                >
                  <GoalCard goal={goal} members={members} />
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>

      {householdId && members.length > 1 && (
        <Suspense fallback={null}>
          <ActivityFeed householdId={householdId} />
        </Suspense>
      )}

      <Fab
        color="primary"
        aria-label="Add expense"
        onClick={() => setIsAddOpen(true)}
        sx={{
          position: 'fixed',
          // Clear the 80px bottom nav plus any gesture/home-indicator inset.
          bottom: { xs: 'calc(96px + env(safe-area-inset-bottom))', md: 32 },
          right: { xs: 16, md: 32 },
        }}
      >
        <AddOutlinedIcon />
      </Fab>

      {isAddOpen && (
        <Suspense fallback={null}>
          <AddExpenseSheet
            open={isAddOpen}
            onClose={() => setIsAddOpen(false)}
            categories={categories ?? []}
          />
        </Suspense>
      )}
    </Box>
  )
}
