import { Box, Skeleton, Typography, useTheme } from '@mui/material'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'
import { useInView } from '@/hooks/useInView'
import { formatINR } from '@/lib/currency'
import { axisTickStyle, chartLineColor, tooltipStyles } from '@/features/insights/chartTheme'
import type { Profile } from '@/types/app'
import type { BalanceTrendRow } from './useSettlement'

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-IN', { month: 'short' })

function shortMonthLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00`)
  if (Number.isNaN(date.getTime())) return month
  return MONTH_LABEL_FORMATTER.format(date)
}

export interface BalanceTrendProps {
  /** Last several months of running balance between the two members, oldest first. */
  data: BalanceTrendRow[]
  /** The two household members, used to label which side of zero each one owns. */
  members: Profile[]
}

/**
 * Line chart of the outstanding "who owes whom" balance over time: each point
 * is the cumulative unsettled balance at that month (net of recorded
 * settlements), so settling up brings the line back to zero. Positive values
 * mean `member_a` (the earlier-joined member) is owed money, negative means
 * they owe it. Deferred until in view, matching the other insights charts.
 */
export function BalanceTrend({ data, members }: BalanceTrendProps) {
  const { ref, inView } = useInView({ threshold: 0.1 })
  const theme = useTheme()

  const nameOf = (userId: string | undefined) =>
    members.find((member) => member.id === userId)?.display_name ?? 'Member'

  const memberA = nameOf(data[0]?.member_a)
  const memberB = nameOf(data[0]?.member_b)

  return (
    <Box ref={ref}>
      <Typography variant="titleMedium" gutterBottom>
        Partner balance over time
      </Typography>
      {!inView ? (
        <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 2 }} />
      ) : data.length === 0 ? (
        <Typography variant="bodyMedium" color="text.secondary">
          Not enough shared expense history yet.
        </Typography>
      ) : (
        <>
          <Typography variant="labelSmall" color="text.secondary">
            Unsettled balance at each month. Above zero: {memberB} owes {memberA}. Below zero:{' '}
            {memberA} owes {memberB}. Settling up returns the line to zero.
          </Typography>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartLineColor(theme)} />
              <XAxis
                dataKey="period_month"
                tickFormatter={shortMonthLabel}
                tick={axisTickStyle(theme)}
                stroke={chartLineColor(theme)}
              />
              <YAxis
                tickFormatter={(value: number) => formatINR(value)}
                width={64}
                tick={axisTickStyle(theme)}
                stroke={chartLineColor(theme)}
              />
              <ReferenceLine y={0} stroke={chartLineColor(theme)} />
              <Tooltip
                formatter={(value) => [
                  formatINR(typeof value === 'number' ? value : 0),
                  'Outstanding balance',
                ]}
                labelFormatter={(label) => shortMonthLabel(String(label))}
                {...tooltipStyles(theme)}
              />
              <Line
                type="monotone"
                dataKey="running_balance"
                stroke={theme.palette.primary.main}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </Box>
  )
}
