import { Box, Skeleton, Stack, Typography } from '@mui/material'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useInView } from '@/hooks/useInView'
import { formatINR } from '@/lib/currency'
import type { MonthlyByCategoryRow } from './useInsights'

export interface SpendByCategoryProps {
  /** Per-category spend rows for the selected month. */
  data: MonthlyByCategoryRow[]
}

/**
 * Pie chart of spend by category with a custom legend (dot, name, amount,
 * percent). Defers rendering the chart until scrolled into view.
 */
export function SpendByCategory({ data }: SpendByCategoryProps) {
  const { ref, inView } = useInView({ threshold: 0.1 })
  const total = data.reduce((sum, row) => sum + row.total_amount, 0)

  return (
    <Box ref={ref}>
      <Typography variant="titleMedium" gutterBottom>
        Spend by Category
      </Typography>
      {!inView ? (
        <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 2 }} />
      ) : data.length === 0 ? (
        <Typography variant="bodyMedium" color="text.secondary">
          No expenses recorded this month.
        </Typography>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="total_amount"
                nameKey="category_name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {data.map((row) => (
                  <Cell key={row.category_id} fill={row.category_color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatINR(typeof value === 'number' ? value : 0)}
              />
            </PieChart>
          </ResponsiveContainer>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {data.map((row) => (
              <Stack
                key={row.category_id}
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: row.category_color,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="bodyMedium" sx={{ flex: 1 }}>
                  {row.category_name}
                </Typography>
                <Typography variant="bodyMedium">{formatINR(row.total_amount)}</Typography>
                <Typography variant="bodySmall" color="text.secondary" sx={{ width: 40, textAlign: 'right' }}>
                  {total > 0 ? Math.round((row.total_amount / total) * 100) : 0}%
                </Typography>
              </Stack>
            ))}
          </Stack>
        </>
      )}
    </Box>
  )
}
