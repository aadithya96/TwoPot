import { useState } from 'react'
import { Box, Fab, Skeleton, Stack, Typography } from '@mui/material'
import Add from '@mui/icons-material/Add'
import { useHouseholdStore } from '@/stores/householdStore'
import { useGoals } from './useGoals'
import { useRealtimeGoals } from './useRealtimeGoals'
import { GoalCard } from './GoalCard'
import { CreateGoalDialog } from './CreateGoalDialog'

/** Savings goals overview: a responsive card grid, empty state, and a FAB to create new goals. */
export function GoalsPage() {
  const householdId = useHouseholdStore((state) => state.householdId)
  const members = useHouseholdStore((state) => state.members)
  const { data: goals, isLoading } = useGoals(householdId ?? undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  useRealtimeGoals(householdId ?? undefined)

  if (!householdId) return null

  return (
    <Box sx={{ p: 2, pb: 10, position: 'relative', minHeight: '100%' }}>
      {isLoading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={180} />
          ))}
        </Box>
      ) : (goals ?? []).length === 0 ? (
        <Stack spacing={1} sx={{ alignItems: 'center', py: 8 }}>
          <Typography variant="titleMedium">No savings goals yet</Typography>
          <Typography variant="bodyMedium" color="text.secondary" align="center">
            Tap + to start saving towards something together.
          </Typography>
        </Stack>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {(goals ?? []).map((goal) => (
            <GoalCard key={goal.id} goal={goal} members={members} />
          ))}
        </Box>
      )}

      <Fab
        color="primary"
        onClick={() => setDialogOpen(true)}
        sx={{ position: 'fixed', bottom: 96, right: 16 }}
        aria-label="Create savings goal"
      >
        <Add />
      </Fab>

      <CreateGoalDialog open={dialogOpen} onClose={() => setDialogOpen(false)} householdId={householdId} />
    </Box>
  )
}
