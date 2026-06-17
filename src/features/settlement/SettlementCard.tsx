import { useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import CheckCircle from '@mui/icons-material/CheckCircle'
import ArrowForward from '@mui/icons-material/ArrowForward'
import { formatINR } from '@/lib/currency'
import { formatMonth } from '@/lib/dates'
import type { Profile } from '@/types/app'
import { useMarkSettled, type SettlementResult } from './useSettlement'

export interface SettlementCardProps {
  /** Net settlement for the period, or null/zero-amount when nothing is owed. */
  settlement: SettlementResult | null
  /** The two household members, used to resolve names/avatars for owedBy/owedTo. */
  members: Profile[]
  /** Household the settlement belongs to. */
  householdId: string
  /** "YYYY-MM" period this settlement covers. */
  periodMonth: string
  /** Whether this period has already been marked settled (e.g. from settlement history). */
  isSettled: boolean
}

/** Card showing who owes whom for a month, with a confirmation flow to mark it settled. */
export function SettlementCard({ settlement, members, householdId, periodMonth, isSettled }: SettlementCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const markSettled = useMarkSettled()
  const monthLabel = formatMonth(periodMonth)

  const isSquare = isSettled || !settlement || settlement.amount === 0

  if (isSquare) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CheckCircle color="success" />
            <Typography variant="titleMedium">All square for {monthLabel}!</Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const ownerOf = (userId: string) => members.find((member) => member.id === userId)
  const debtor = ownerOf(settlement.owedBy)
  const creditor = ownerOf(settlement.owedTo)

  const handleConfirm = async () => {
    await markSettled.mutateAsync({
      householdId,
      periodMonth,
      amount: settlement.amount,
      owedBy: settlement.owedBy,
      owedTo: settlement.owedTo,
    })
    setConfirmOpen(false)
  }

  return (
    <>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
              <Stack alignItems="center" spacing={0.5}>
                <Avatar src={debtor?.avatar_url ?? undefined}>{debtor?.display_name?.[0]}</Avatar>
                <Typography variant="labelSmall">{debtor?.display_name ?? 'Unknown'}</Typography>
              </Stack>
              <ArrowForward color="action" />
              <Stack alignItems="center" spacing={0.5}>
                <Avatar src={creditor?.avatar_url ?? undefined}>{creditor?.display_name?.[0]}</Avatar>
                <Typography variant="labelSmall">{creditor?.display_name ?? 'Unknown'}</Typography>
              </Stack>
            </Stack>

            <Typography variant="bodyLarge" align="center">
              {debtor?.display_name ?? 'Unknown'} owes {creditor?.display_name ?? 'Unknown'}{' '}
              <strong>{formatINR(settlement.amount)}</strong> for {monthLabel}
            </Typography>

            <Button variant="contained" onClick={() => setConfirmOpen(true)}>
              Mark as Settled
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm settlement</DialogTitle>
        <DialogContent>
          <Typography variant="bodyMedium">
            Mark {formatINR(settlement.amount)} for {monthLabel} as settled between{' '}
            {debtor?.display_name ?? 'Unknown'} and {creditor?.display_name ?? 'Unknown'}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={markSettled.isPending}
            onClick={handleConfirm}
            startIcon={markSettled.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
