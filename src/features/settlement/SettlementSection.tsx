import { useMemo, useState } from 'react'
import { MenuItem, Select, Skeleton, Stack, Typography } from '@mui/material'
import { formatMonth, monthKey } from '@/lib/dates'
import type { Profile } from '@/types/app'
import { SettlementCard } from './SettlementCard'
import {
  summarizeOutstanding,
  useBalanceTrend,
  useIsSettled,
  useMarkMonthsSettled,
  useSettlement,
} from './useSettlement'

const ALL_MONTHS = 'all'

export interface SettlementSectionProps {
  /** Household the settlements belong to. */
  householdId: string
  /** The two household members. */
  members: Profile[]
  /** The signed-in user's id, forwarded to the card's "Pay via UPI" action. */
  currentUserId?: string
}

/**
 * Home-page settle-up section: a period picker (this month, any month with
 * settlement history, or all months combined) above the settlement card.
 * "All months" nets every month's outstanding balance into one figure and
 * marks all of them settled together.
 */
export function SettlementSection({ householdId, members, currentUserId }: SettlementSectionProps) {
  const currentMonth = monthKey()
  const [period, setPeriod] = useState<string>(currentMonth)
  const isAll = period === ALL_MONTHS

  const { data: trend, isLoading: isTrendLoading } = useBalanceTrend(householdId)
  const { data: settlement, isLoading: isSettlementLoading } = useSettlement(
    isAll ? undefined : householdId,
    isAll ? currentMonth : period
  )
  const { data: isSettled, isLoading: isSettledLoading } = useIsSettled(
    isAll ? undefined : householdId,
    isAll ? currentMonth : period
  )
  const markMonthsSettled = useMarkMonthsSettled()

  const trendRows = useMemo(() => trend ?? [], [trend])

  // Every month with settlement history, newest first, always including the
  // current month even before its first shared expense lands.
  const monthOptions = useMemo(() => {
    const months = new Set<string>([currentMonth])
    for (const row of trendRows) months.add(row.period_month.slice(0, 7))
    return [...months].sort().reverse()
  }, [trendRows, currentMonth])

  const { settlement: allMonthsSettlement, months: outstandingMonths } = useMemo(
    () => summarizeOutstanding(trendRows),
    [trendRows]
  )

  const settleAllMonths = async () => {
    await markMonthsSettled.mutateAsync({ householdId, months: outstandingMonths })
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="titleMedium" component="h2">
          Settle up
        </Typography>
        <Select
          size="small"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          inputProps={{ 'aria-label': 'Settlement period' }}
        >
          {monthOptions.map((month) => (
            <MenuItem key={month} value={month}>
              {month === currentMonth ? `${formatMonth(month)} (this month)` : formatMonth(month)}
            </MenuItem>
          ))}
          <MenuItem value={ALL_MONTHS}>All months</MenuItem>
        </Select>
      </Stack>

      {isAll ? (
        isTrendLoading ? (
          <Skeleton variant="rounded" height={200} />
        ) : (
          <SettlementCard
            settlement={allMonthsSettlement}
            members={members}
            householdId={householdId}
            periodMonth={currentMonth}
            isSettled={false}
            currentUserId={currentUserId}
            periodLabel="all months"
            onConfirm={settleAllMonths}
          />
        )
      ) : isSettlementLoading || isSettledLoading ? (
        <Skeleton variant="rounded" height={200} />
      ) : (
        <SettlementCard
          settlement={settlement ?? null}
          members={members}
          householdId={householdId}
          periodMonth={period}
          isSettled={isSettled ?? false}
          currentUserId={currentUserId}
        />
      )}
    </Stack>
  )
}
