import { useMemo } from 'react'
import {
  Avatar,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
import { formatINR } from '@/lib/currency'
import { useExpenses } from '@/features/expenses'
import { computeAllocation, summarizeSpending, usePotConfig } from './usePots'

export interface PotsOverviewProps {
  /** Household whose pots are shown. */
  householdId: string
  /** "YYYY-MM" month whose spending is measured against the pots. */
  month: string
}

/** A labelled progress bar showing how much of a pot has been spent. */
function PotBar({
  label,
  spent,
  total,
  caption,
}: {
  label: React.ReactNode
  spent: number
  total: number
  caption: string
}) {
  const ratio = total > 0 ? Math.min(100, (spent / total) * 100) : 0
  const overspent = total > 0 && spent > total
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="labelLarge">{label}</Typography>
        <Typography variant="labelLarge" color={overspent ? 'error.main' : 'text.primary'}>
          {formatINR(total)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={ratio}
        color={overspent ? 'error' : 'primary'}
        aria-label={`${label} spending`}
        sx={{ height: 8, borderRadius: 4, mt: 0.75 }}
      />
      <Typography variant="labelSmall" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {caption}
      </Typography>
    </Box>
  )
}

/**
 * Dashboard card for the "two pots" model: a shared pot funded by both partners
 * plus each partner's personal pot, each shown with this month's spend against it.
 * Renders nothing unless the model is enabled and a partner has joined.
 */
export function PotsOverview({ householdId, month }: PotsOverviewProps) {
  const { data: config } = usePotConfig(householdId)
  const { data: expenses } = useExpenses(householdId, month)

  const allocation = useMemo(
    () =>
      config ? computeAllocation(config.rule, config.sharedPotTarget, config.members) : null,
    [config]
  )
  const spending = useMemo(() => summarizeSpending(expenses ?? []), [expenses])

  if (!config?.enabled || !allocation || allocation.members.length < 2) return null

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <SavingsOutlinedIcon />
          <Typography variant="titleMedium">Two pots</Typography>
        </Stack>

        <Stack spacing={2.5}>
          <PotBar
            label="Shared pot"
            spent={spending.sharedSpent}
            total={allocation.sharedPot}
            caption={`${formatINR(spending.sharedSpent)} spent · ${formatINR(
              Math.max(0, allocation.sharedPot - spending.sharedSpent)
            )} left`}
          />

          {allocation.members.map((member) => {
            const spent = spending.personalSpentByUser.get(member.userId) ?? 0
            const pot = member.personalPot
            return (
              <PotBar
                key={member.userId}
                label={
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Avatar src={member.avatarUrl ?? undefined} alt={member.displayName} sx={{ width: 24, height: 24 }}>
                      {member.displayName[0]}
                    </Avatar>
                    <span>{member.displayName}'s pot</span>
                  </Stack>
                }
                spent={spent}
                total={pot ?? 0}
                caption={
                  pot == null
                    ? `Set ${member.displayName}'s income to see their personal pot`
                    : `${formatINR(spent)} spent · ${formatINR(Math.max(0, pot - spent))} left`
                }
              />
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}
