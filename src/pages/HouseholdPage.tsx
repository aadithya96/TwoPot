import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useSnackbar } from 'notistack'
import { useHousehold, useGenerateInvite } from '@/features/auth/useHousehold'

/** Settings sub-page for managing the household: shows members and the partner invite code. */
export function HouseholdPage() {
  const { data, isLoading } = useHousehold()
  const generateInvite = useGenerateInvite()
  const { enqueueSnackbar } = useSnackbar()

  // Locally generated code takes precedence over the (possibly stale) stored one.
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  const household = data?.household
  const members = data?.members ?? []
  const hasPartner = members.length >= 2
  const code = generatedCode ?? household?.invite_code ?? null

  const handleGenerate = async () => {
    if (!household) return
    try {
      const next = await generateInvite.mutateAsync(household.id)
      setGeneratedCode(next)
    } catch {
      enqueueSnackbar('Could not generate an invite code', { variant: 'error' })
    }
  }

  const handleCopy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      enqueueSnackbar('Invite code copied', { variant: 'success' })
    } catch {
      enqueueSnackbar('Could not copy', { variant: 'warning' })
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, pb: { xs: 12, md: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="titleLarge">Household</Typography>

      {isLoading ? (
        <CircularProgress size={24} />
      ) : (
        <>
          <Card>
            <CardContent>
              <Typography variant="titleMedium" sx={{ mb: 1 }}>
                {household?.name ?? 'Our Home'}
              </Typography>
              <Typography variant="bodyMedium" color="text.secondary">
                {members.map((member) => member.display_name).join(' & ')}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              {hasPartner ? (
                <Alert severity="success">Your partner has joined this household.</Alert>
              ) : (
                <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
                  <Typography variant="bodyMedium" color="text.secondary">
                    Share this 6-digit code so your partner can join. Codes expire after 48 hours.
                  </Typography>
                  {code && (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="headlineMedium" sx={{ letterSpacing: '0.25em' }}>
                        {code}
                      </Typography>
                      <IconButton onClick={handleCopy} aria-label="Copy invite code">
                        <ContentCopyIcon />
                      </IconButton>
                    </Stack>
                  )}
                  <Button
                    variant="contained"
                    onClick={handleGenerate}
                    disabled={generateInvite.isPending}
                  >
                    {generateInvite.isPending ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : code ? (
                      'Regenerate code'
                    ) : (
                      'Generate invite code'
                    )}
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}
