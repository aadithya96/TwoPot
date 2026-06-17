import { Box, Skeleton, Typography, useTheme } from '@mui/material'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { useInView } from '@/hooks/useInView'
import { formatINR } from '@/lib/currency'
import type { MonthlyTrendRow } from './useInsights'

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-IN', { month: 'short' })

function formatThousands(value: number): string {
  return `₹${Math.round(value / 100000) / 10}k`
}

function shortMonthLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00`)
  if (Number.isNaN(date.getTime())) return month
  return MONTH_LABEL_FORMATTER.format(date)
}

export interface MonthlyTrendProps {
  /** Last several months of total spend, oldest first. */
  data: MonthlyTrendRow[]
}

/** Area chart of total household spend over the last 6 months, deferred until in view. */
export function MonthlyTrend({ data }: MonthlyTrendProps) {
  const { ref, inView } = useInView({ threshold: 0.1 })
  const theme = useTheme()
  const last6 = data.slice(-6)

  return (
    <Box ref={ref}>
      <Typography variant="titleMedium" gutterBottom>
        Monthly Trend
      </Typography>
      {!inView ? (
        <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 2 }} />
      ) : last6.length === 0 ? (
        <Typography variant="bodyMedium" color="text.secondary">
          Not enough history yet.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={last6} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickFormatter={shortMonthLabel} />
            <YAxis tickFormatter={formatThousands} width={48} />
            <Tooltip formatter={(value: number) => formatINR(value)} labelFormatter={shortMonthLabel} />
            <Area
              type="monotone"
              dataKey="total_amount"
              stroke={theme.palette.primary.main}
              fill={theme.palette.primary.light}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Box>
  )
}
