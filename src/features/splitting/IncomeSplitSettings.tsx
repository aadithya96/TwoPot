import { useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import { useSnackbar } from 'notistack'
import { AmountField } from '@/components/forms'
import { fairPctA, useIncomeSplit, useToggleIncomeSplit, useUpdateMemberIncome } from './useIncomeSplit'

export interface IncomeSplitSettingsProps {
  /** Household whose income-split settings are being edited. */
  householdId: string
}

/**
 * Settings card for income-based fair splitting: a toggle plus an income field
 * per member, with a live preview of the resulting shared-expense split.
 */
export function IncomeSplitSettings({ householdId }: IncomeSplitSettingsProps) {
  const { data, isLoading } = useIncomeSplit(householdId)
  const updateIncome = useUpdateMemberIncome()
  const toggle = useToggleIncomeSplit()
  const { enqueueSnackbar } = useSnackbar()

  // Local, editable copy of each member's income (paise), keyed by user id.
  const [incomes, setIncomes] = useState<Record<string, number>>({})
  // Re-seed local edits from the server only when the persisted incomes change
  // (initial load or after a successful save), not on every background refetch.
  const serverSignature = data
    ? data.members.map((m) => `${m.userId}:${m.income ?? ''}`).join('|')
    : ''
  const [syncedSignature, setSyncedSignature] = useState<string | null>(null)
  if (data && serverSignature !== syncedSignature) {
    setSyncedSignature(serverSignature)
    setIncomes(Object.fromEntries(data.members.map((m) => [m.userId, m.income ?? 0])))
  }

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent>
          <CircularProgress size={20} />
        </CardContent>
      </Card>
    )
  }

  const [memberA, memberB] = data.members
  const hasPartner = data.members.length >= 2
  const previewPctA = fairPctA(
    memberA ? incomes[memberA.userId] ?? 0 : null,
    memberB ? incomes[memberB.userId] ?? 0 : null
  )

  const handleSave = async () => {
    try {
      await Promise.all(
        data.members.map((member) =>
          updateIncome.mutateAsync({
            householdId,
            userId: member.userId,
            income: incomes[member.userId] || null,
          })
        )
      )
      enqueueSnackbar('Incomes saved', { variant: 'success' })
    } catch {
      enqueueSnackbar('Could not save incomes', { variant: 'error' })
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
          <BalanceOutlinedIcon />
          <Typography variant="titleMedium" sx={{ flex: 1 }}>
            Income-based splitting
          </Typography>
          <Switch
            checked={data.enabled}
            onChange={(event) =>
              toggle.mutate({ householdId, enabled: event.target.checked })
            }
            slotProps={{ input: { 'aria-label': 'Toggle income-based splitting' } }}
          />
        </Stack>
        <Typography variant="bodyMedium" color="text.secondary">
          Default new shared expenses to a split proportional to each person's income
          instead of 50/50.
        </Typography>

        {!hasPartner ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Invite your partner to use income-based splitting.
          </Alert>
        ) : (
          <>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {data.members.map((member) => (
                <Stack key={member.userId} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Avatar src={member.avatarUrl ?? undefined} sx={{ width: 36, height: 36 }}>
                    {member.displayName[0]}
                  </Avatar>
                  <AmountField
                    label={`${member.displayName}'s monthly income`}
                    value={incomes[member.userId] ?? 0}
                    onChange={(paise) =>
                      setIncomes((prev) => ({ ...prev, [member.userId]: paise }))
                    }
                  />
                </Stack>
              ))}
            </Stack>

            {previewPctA != null && memberA && memberB && (
              <Typography variant="bodyMedium" sx={{ mt: 2 }}>
                Shared split: {memberA.displayName} {previewPctA}% · {memberB.displayName}{' '}
                {100 - previewPctA}%
              </Typography>
            )}

            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={handleSave} disabled={updateIncome.isPending}>
                {updateIncome.isPending ? <CircularProgress size={20} color="inherit" /> : 'Save incomes'}
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  )
}
