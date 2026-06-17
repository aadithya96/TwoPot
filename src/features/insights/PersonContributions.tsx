import { Box, Typography, useTheme } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { formatINR } from '@/lib/currency'
import type { Profile } from '@/types/app'
import type { PersonContributionRow } from './useInsights'

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-IN', { month: 'short' })

function shortMonthLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00`)
  if (Number.isNaN(date.getTime())) return month
  return MONTH_LABEL_FORMATTER.format(date)
}

interface ChartRow {
  month: string
  [userId: string]: string | number
}

function pivotByMonth(data: PersonContributionRow[]): ChartRow[] {
  const byMonth = new Map<string, ChartRow>()
  for (const row of data) {
    const existing = byMonth.get(row.month) ?? { month: row.month }
    existing[row.user_id] = row.total_amount
    byMonth.set(row.month, existing)
  }
  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export interface PersonContributionsProps {
  /** Monthly per-member spend rows. */
  data: PersonContributionRow[]
  /** The two household members, used to assign a bar + colour + name to each. */
  members: Profile[]
}

/** Grouped bar chart comparing each household member's monthly spend. */
export function PersonContributions({ data, members }: PersonContributionsProps) {
  const chartData = pivotByMonth(data)
  const theme = useTheme()
  const barColors = [theme.palette.primary.main, theme.palette.secondary.main] as const

  return (
    <Box>
      <Typography variant="titleMedium" gutterBottom>
        Contributions
      </Typography>
      {chartData.length === 0 ? (
        <Typography variant="bodyMedium" color="text.secondary">
          No contribution history yet.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickFormatter={shortMonthLabel} />
            <YAxis width={48} />
            <Tooltip
              formatter={(value) => formatINR(typeof value === 'number' ? value : 0)}
              labelFormatter={(label) => shortMonthLabel(String(label))}
            />
            <Legend />
            {members.map((member, index) => (
              <Bar
                key={member.id}
                dataKey={member.id}
                name={member.display_name}
                fill={barColors[index % 2]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Box>
  )
}
