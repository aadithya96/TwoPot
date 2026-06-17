import { Box, Paper, Typography } from '@mui/material'
import { formatINR } from '@/lib/currency'
import type { Expense } from '@/types/app'

export interface StatCardsProps {
  /** This month's expenses, used to derive every stat below. */
  expenses: Expense[]
  /** Reference date used to determine "today" / days remaining in the month. */
  referenceDate?: Date
}

interface CategoryTotal {
  categoryId: string | null
  total: number
}

function computeStats(expenses: Expense[], referenceDate: Date) {
  const totalThisMonth = expenses.reduce((sum, e) => sum + e.amount, 0)

  const totalsByCategory = new Map<string | null, number>()
  for (const expense of expenses) {
    totalsByCategory.set(
      expense.category_id,
      (totalsByCategory.get(expense.category_id) ?? 0) + expense.amount
    )
  }
  let largestCategory: CategoryTotal | null = null
  for (const [categoryId, total] of totalsByCategory) {
    if (!largestCategory || total > largestCategory.total) {
      largestCategory = { categoryId, total }
    }
  }

  const dayOfMonth = referenceDate.getDate()
  const averageDaily = dayOfMonth > 0 ? totalThisMonth / dayOfMonth : 0

  const daysInMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0
  ).getDate()
  const daysRemaining = Math.max(0, daysInMonth - dayOfMonth)

  return { totalThisMonth, largestCategory, averageDaily, daysRemaining }
}

/** 2x2 grid of summary stat cards: total spend, largest category, average daily, days remaining. */
export function StatCards({ expenses, referenceDate = new Date() }: StatCardsProps) {
  const { totalThisMonth, largestCategory, averageDaily, daysRemaining } = computeStats(
    expenses,
    referenceDate
  )

  const cards = [
    { label: 'Total this month', value: formatINR(totalThisMonth) },
    {
      label: 'Largest category',
      value: largestCategory ? formatINR(largestCategory.total) : '—',
    },
    { label: 'Average daily', value: formatINR(Math.round(averageDaily)) },
    { label: 'Days remaining', value: String(daysRemaining) },
  ]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1.5,
      }}
    >
      {cards.map((card) => (
        <Paper key={card.label} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="labelSmall" color="text.secondary">
            {card.label}
          </Typography>
          <Typography variant="titleLarge">{card.value}</Typography>
        </Paper>
      ))}
    </Box>
  )
}
