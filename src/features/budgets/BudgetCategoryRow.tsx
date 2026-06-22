import { useState } from 'react'
import { Box, LinearProgress, Stack, Typography } from '@mui/material'
import { formatINR } from '@/lib/currency'
import { CategoryIcon } from '@/components/CategoryIcon'
import type { BudgetUsage, Category } from '@/types/app'
import { SetBudgetDialog } from './SetBudgetDialog'

export interface BudgetCategoryRowProps {
  /** Usage row for this category (spend vs. budget). */
  usage: BudgetUsage
  /** Household the budget belongs to. */
  householdId: string
  /** Categories available for the edit dialog's select (unused when pre-filled, kept for prop consistency). */
  categories: Category[]
}

/** Returns the MD3 palette token name (success/warning/error) for a given spent/budget ratio. */
function colorForRatio(ratio: number): 'success.main' | 'warning.main' | 'error.main' {
  if (ratio >= 1) return 'error.main'
  if (ratio >= 0.8) return 'warning.main'
  return 'success.main'
}

/** Row showing a category's icon, name, spend vs. budget, and a colored progress bar with a percentage label. */
export function BudgetCategoryRow({ usage, householdId, categories }: BudgetCategoryRowProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const ratio = usage.budget_amount > 0 ? usage.spent_amount / usage.budget_amount : 0
  const percent = Math.round(ratio * 100)
  const color = colorForRatio(ratio)

  return (
    <>
      <Box
        component="button"
        onClick={() => setDialogOpen(true)}
        sx={{
          width: '100%',
          textAlign: 'left',
          border: 'none',
          background: 'none',
          p: 0,
          cursor: 'pointer',
        }}
      >
        <Stack spacing={0.75} sx={{ py: 1.5 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CategoryIcon
                icon={usage.category_icon}
                fontSize="small"
                sx={{ color: usage.category_color }}
              />
              <Typography variant="titleMedium" component="span">
                {usage.category_name}
              </Typography>
            </Stack>
            <Typography variant="bodyMedium" color="text.secondary">
              {formatINR(usage.spent_amount)} / {formatINR(usage.budget_amount)}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(percent, 100)}
              sx={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                '& .MuiLinearProgress-bar': { backgroundColor: color },
              }}
            />
            <Typography variant="labelMedium" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
              {percent}%
            </Typography>
          </Stack>
        </Stack>
      </Box>
      <SetBudgetDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        householdId={householdId}
        categories={categories}
        initialUsage={usage}
      />
    </>
  )
}
