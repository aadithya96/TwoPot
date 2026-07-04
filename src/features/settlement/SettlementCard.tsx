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
import QrCodeOutlinedIcon from '@mui/icons-material/QrCodeOutlined'
import { formatINR } from '@/lib/currency'
import { formatMonth } from '@/lib/dates'
import { buildUpiPayLink } from '@/lib/upi'
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
  /** The signed-in user's id, used to show the "Pay via UPI" action only to the debtor. */
  currentUserId?: string
  /** Display label for the period; defaults to the formatted `periodMonth`. */
  periodLabel?: string
  /**
   * Overrides what "Confirm" does — used by the all-months settle-up, which
   * marks every outstanding month settled instead of just `periodMonth`.
   */
  onConfirm?: () => Promise<void>
}

/** Card showing who owes whom for a period, with a confirmation flow to mark it settled. */
export function SettlementCard({
  settlement,
  members,
  householdId,
  periodMonth,
  isSettled,
  currentUserId,
  periodLabel,
  onConfirm,
}: SettlementCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const markSettled = useMarkSettled()
  const monthLabel = periodLabel ?? formatMonth(periodMonth)

  const isSquare = isSettled || !settlement || settlement.amount === 0

  if (isSquare) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
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

  const isDebtor = currentUserId === settlement.owedBy
  const upiLink =
    isDebtor && creditor?.upi_vpa
      ? buildUpiPayLink({
          vpa: creditor.upi_vpa,
          payeeName: creditor.display_name,
          amount: settlement.amount,
          note: `TwoPot settlement ${monthLabel}`,
        })
      : null

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      if (onConfirm) {
        await onConfirm()
      } else {
        await markSettled.mutateAsync({
          householdId,
          periodMonth,
          amount: settlement.amount,
          owedBy: settlement.owedBy,
          owedTo: settlement.owedTo,
        })
      }
      setConfirmOpen(false)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                <Avatar src={debtor?.avatar_url ?? undefined} alt={debtor?.display_name ?? ''}>{debtor?.display_name?.[0]}</Avatar>
                <Typography variant="labelSmall">{debtor?.display_name ?? 'Unknown'}</Typography>
              </Stack>
              <ArrowForward color="action" />
              <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                <Avatar src={creditor?.avatar_url ?? undefined} alt={creditor?.display_name ?? ''}>{creditor?.display_name?.[0]}</Avatar>
                <Typography variant="labelSmall">{creditor?.display_name ?? 'Unknown'}</Typography>
              </Stack>
            </Stack>

            <Typography variant="bodyLarge" align="center">
              {debtor?.display_name ?? 'Unknown'} owes {creditor?.display_name ?? 'Unknown'}{' '}
              <strong>{formatINR(settlement.amount)}</strong> for {monthLabel}
            </Typography>

            {upiLink && (
              <Button
                variant="outlined"
                startIcon={<QrCodeOutlinedIcon />}
                component="a"
                href={upiLink}
              >
                Pay via UPI
              </Button>
            )}

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
            disabled={isConfirming}
            onClick={handleConfirm}
            startIcon={isConfirming ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
