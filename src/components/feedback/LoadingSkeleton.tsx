import { Box, Skeleton, Stack } from '@mui/material'

/** Skeleton placeholder shaped like a single expense list row. */
export function ExpenseRowSkeleton() {
  return (
    <Stack direction="row" spacing={2} sx={{ px: 2, py: 1.5, alignItems: 'center' }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="40%" height={16} />
      </Box>
      <Skeleton variant="text" width={56} height={24} />
    </Stack>
  )
}

/** Skeleton placeholder shaped like a savings goal card. */
export function GoalCardSkeleton() {
  return (
    <Box sx={{ p: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={2} sx={{ mb: 1.5, alignItems: 'center' }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="text" width="50%" height={24} />
      </Stack>
      <Skeleton variant="rounded" width="100%" height={8} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="30%" height={16} />
    </Box>
  )
}

/** Skeleton placeholder shaped like a budget category row with a progress bar. */
export function BudgetRowSkeleton() {
  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Stack direction="row" sx={{ mb: 0.5, justifyContent: 'space-between' }}>
        <Skeleton variant="text" width="40%" height={20} />
        <Skeleton variant="text" width="20%" height={20} />
      </Stack>
      <Skeleton variant="rounded" width="100%" height={6} />
    </Box>
  )
}
