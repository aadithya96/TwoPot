import { useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Divider,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
import { useSnackbar } from 'notistack'
import { AmountField } from '@/components/forms'
import { formatINR } from '@/lib/currency'
import {
  computeAllocation,
  usePotConfig,
  useUpdateMemberContribution,
  useUpdatePotConfig,
  type PotAllocationRule,
} from './usePots'

export interface PotSettingsProps {
  /** Household whose two-pots settings are being edited. */
  householdId: string
}

const RULE_HELP: Record<PotAllocationRule, string> = {
  proportional: 'Each partner funds the shared pot in proportion to their income.',
  equal: 'Both partners contribute the same amount to the shared pot.',
  custom: 'Set exactly how much each partner puts into the shared pot.',
}

/**
 * Settings card for the "two pots" income model: a toggle, an allocation rule,
 * the shared-pot target (or per-partner contributions), and a live preview of
 * the resulting shared and personal pots.
 */
export function PotSettings({ householdId }: PotSettingsProps) {
  const { data, isLoading } = usePotConfig(householdId)
  const updateConfig = useUpdatePotConfig()
  const updateContribution = useUpdateMemberContribution()
  const { enqueueSnackbar } = useSnackbar()

  // Local, editable copy of the config, re-seeded only when the persisted values
  // change (initial load or after a save), not on every background refetch.
  const [rule, setRule] = useState<PotAllocationRule>('proportional')
  const [target, setTarget] = useState(0)
  const [contributions, setContributions] = useState<Record<string, number>>({})
  const serverSignature = data
    ? [
        data.rule,
        data.sharedPotTarget ?? '',
        ...data.members.map((m) => `${m.userId}:${m.contribution ?? ''}`),
      ].join('|')
    : ''
  const [syncedSignature, setSyncedSignature] = useState<string | null>(null)
  if (data && serverSignature !== syncedSignature) {
    setSyncedSignature(serverSignature)
    setRule(data.rule)
    setTarget(data.sharedPotTarget ?? 0)
    setContributions(Object.fromEntries(data.members.map((m) => [m.userId, m.contribution ?? 0])))
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

  const hasPartner = data.members.length >= 2

  const preview = computeAllocation(
    rule,
    target,
    data.members.map((m) => ({ ...m, contribution: contributions[m.userId] ?? 0 }))
  )

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync({
        householdId,
        rule,
        sharedPotTarget: rule === 'custom' ? null : target || null,
      })
      if (rule === 'custom') {
        await Promise.all(
          data.members.map((member) =>
            updateContribution.mutateAsync({
              householdId,
              userId: member.userId,
              contribution: contributions[member.userId] || null,
            })
          )
        )
      }
      enqueueSnackbar('Pot settings saved', { variant: 'success' })
    } catch {
      enqueueSnackbar('Could not save pot settings', { variant: 'error' })
    }
  }

  const isSaving = updateConfig.isPending || updateContribution.isPending

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
          <SavingsOutlinedIcon />
          <Typography variant="titleMedium" sx={{ flex: 1 }}>
            Two pots
          </Typography>
          <Switch
            checked={data.enabled}
            onChange={(event) =>
              updateConfig.mutate({ householdId, enabled: event.target.checked })
            }
            slotProps={{ input: { 'aria-label': 'Toggle two-pots model' } }}
          />
        </Stack>
        <Typography variant="bodyMedium" color="text.secondary">
          Fund a shared pot for joint spending and keep the rest of each income in personal pots.
        </Typography>

        {!hasPartner ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Invite your partner to use the two-pots model.
          </Alert>
        ) : (
          <Collapse in={data.enabled} unmountOnExit>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={rule}
                onChange={(_event, next: PotAllocationRule | null) => next && setRule(next)}
                aria-label="Shared-pot allocation rule"
              >
                <ToggleButton value="proportional">By income</ToggleButton>
                <ToggleButton value="equal">Equal</ToggleButton>
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="bodySmall" color="text.secondary">
                {RULE_HELP[rule]}
              </Typography>

              {rule === 'custom' ? (
                <Stack spacing={2}>
                  {data.members.map((member) => (
                    <Stack
                      key={member.userId}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: 'center' }}
                    >
                      <Avatar src={member.avatarUrl ?? undefined} sx={{ width: 36, height: 36 }}>
                        {member.displayName[0]}
                      </Avatar>
                      <AmountField
                        label={`${member.displayName}'s contribution`}
                        value={contributions[member.userId] ?? 0}
                        onChange={(paise) =>
                          setContributions((prev) => ({ ...prev, [member.userId]: paise }))
                        }
                      />
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <AmountField
                  label="Monthly shared-pot target"
                  value={target}
                  onChange={setTarget}
                />
              )}

              {rule === 'proportional' &&
                data.members.some((m) => m.income == null) && (
                  <Alert severity="info">
                    Set both incomes under income-based splitting to split the pot by income. Until
                    then it's split equally.
                  </Alert>
                )}

              <Divider />

              <Box>
                <Typography variant="labelLarge">Preview</Typography>
                <Typography variant="bodyMedium" sx={{ mt: 0.5 }}>
                  Shared pot: {formatINR(preview.sharedPot)}
                </Typography>
                {preview.members.map((member) => (
                  <Typography key={member.userId} variant="bodyMedium" color="text.secondary">
                    {member.displayName}: {formatINR(member.contribution)} in
                    {member.personalPot != null
                      ? ` · ${formatINR(member.personalPot)} personal`
                      : ''}
                  </Typography>
                ))}
              </Box>

              <Box>
                <Button variant="contained" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save pot settings'}
                </Button>
              </Box>
            </Stack>
          </Collapse>
        )}
      </CardContent>
    </Card>
  )
}
