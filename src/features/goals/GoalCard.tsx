import { useState } from 'react'
import { Box, Button, Card, CardContent, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material'
import CheckCircle from '@mui/icons-material/CheckCircle'
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined'
import ShowChartOutlined from '@mui/icons-material/ShowChartOutlined'
import { formatINR } from '@/lib/currency'
import type { Profile, SavingsGoal } from '@/types/app'
import { GoalIcon } from './GoalIcon'
import { useGoalContributions } from './useGoals'
import { computeAverageDailyRate, estimateProjectedCompletion } from './projection'
import { ContributeDialog } from './ContributeDialog'

export interface GoalCardProps {
  /** The savings goal to display. */
  goal: SavingsGoal
  /** The two household members, passed through to the contribute dialog. */
  members: Profile[]
}

/** MD3 card for a single savings goal: progress, projected completion, and a contribute action. */
export function GoalCard({ goal, members }: GoalCardProps) {
  const [contributeOpen, setContributeOpen] = useState(false)
  const { data: contributions } = useGoalContributions(goal.id)

  const percent = goal.target_amount > 0 ? Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100) : 0
  const isComplete = Boolean(goal.completed_at)

  const averageDailyRate = computeAverageDailyRate(contributions ?? [])
  const projection = estimateProjectedCompletion({
    currentAmount: goal.current_amount,
    targetAmount: goal.target_amount,
    averageDailyRate,
  })

  return (
    <>
      <Card sx={{ overflow: 'hidden' }}>
        <Box sx={{ height: 8, bgcolor: goal.color }} />
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <GoalIcon icon={goal.icon} sx={{ color: goal.color }} />
              <Typography variant="titleMedium" component="span" sx={{ flex: 1 }}>
                {goal.name}
              </Typography>
            </Stack>

            {goal.backing_type === 'bank_account' && (
              <Tooltip title={goal.backing_upi_vpa ?? ''}>
                <Chip
                  icon={<AccountBalanceOutlined fontSize="small" />}
                  label={goal.backing_bank_label ?? 'Bank account'}
                  size="small"
                  variant="outlined"
                  sx={{ alignSelf: 'flex-start' }}
                />
              </Tooltip>
            )}

            {goal.backing_type === 'mutual_fund' && (
              <Stack spacing={0.5}>
                <Chip
                  icon={<ShowChartOutlined fontSize="small" />}
                  label={goal.backing_mf_scheme_name ?? 'Mutual fund'}
                  size="small"
                  variant="outlined"
                  sx={{ alignSelf: 'flex-start', maxWidth: '100%' }}
                />
                <Typography variant="labelSmall" color="text.secondary">
                  {goal.backing_mf_units} units
                  {goal.backing_mf_nav !== null
                    ? ` @ ${formatINR(Math.round(goal.backing_mf_nav * 100))} NAV${
                        goal.backing_mf_nav_date ? ` (as of ${goal.backing_mf_nav_date})` : ''
                      }`
                    : ' — NAV pending'}
                </Typography>
              </Stack>
            )}

            <Typography variant="bodyMedium" color="text.secondary">
              {formatINR(goal.current_amount)} of {formatINR(goal.target_amount)}
            </Typography>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <LinearProgress
                variant="determinate"
                value={percent}
                aria-label={`${goal.name} progress`}
                sx={{ flex: 1, height: 8, borderRadius: 4 }}
              />
              <Typography variant="labelMedium" color="text.secondary">
                {percent}%
              </Typography>
            </Stack>

            {!isComplete && projection && (
              <Typography variant="labelSmall" color="text.secondary">
                Projected completion: {projection}
              </Typography>
            )}

            {isComplete ? (
              <Chip
                icon={<CheckCircle fontSize="small" />}
                label="Goal reached!"
                color="success"
                size="small"
                sx={{ alignSelf: 'flex-start' }}
              />
            ) : (
              <Button variant="outlined" size="small" onClick={() => setContributeOpen(true)}>
                Contribute
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <ContributeDialog
        open={contributeOpen}
        onClose={() => setContributeOpen(false)}
        goal={goal}
        members={members}
        averageDailyRate={averageDailyRate}
      />
    </>
  )
}
