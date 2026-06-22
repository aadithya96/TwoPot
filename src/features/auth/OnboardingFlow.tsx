import { useMemo, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grow,
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircle from '@mui/icons-material/CheckCircle'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ShareIcon from '@mui/icons-material/Share'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { queryKeys } from '@/lib/queryKeys'
import { useCurrentUser, useSession } from './useAuth'
import { useCreateHousehold, useJoinHousehold } from './useHousehold'

const STEPS = ['Welcome', 'Your Household', 'Invite Partner', 'Done']

type HouseholdChoice = 'create' | 'join'

/**
 * Multi-step onboarding wizard: confirm display name, create or join a
 * household, share an invite code, then land back in the app.
 */
export function OnboardingFlow() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { data: profile } = useCurrentUser()
  const createHousehold = useCreateHousehold()
  const joinHousehold = useJoinHousehold()
  const [finishing, setFinishing] = useState(false)

  const [activeStep, setActiveStep] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [choice, setChoice] = useState<HouseholdChoice>('create')
  const [householdName, setHouseholdName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolvedName = displayName || profile?.display_name || ''

  const steps = useMemo(
    () => (choice === 'join' ? STEPS.filter((step) => step !== 'Invite Partner') : STEPS),
    [choice]
  )

  const handleNextFromHousehold = async () => {
    setError(null)
    try {
      if (choice === 'create') {
        const result = await createHousehold.mutateAsync(householdName || `${resolvedName}'s household`)
        setInviteCode(result.inviteCode)
        setActiveStep(2)
      } else {
        await joinHousehold.mutateAsync(joinCode)
        setActiveStep(steps.length - 1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  // Before leaving onboarding, force a fresh fetch of the household query so
  // the AuthGuard sees the just-created/joined household instead of its cached
  // "no household" result -- otherwise it bounces the user back to /onboarding
  // and they have to complete the wizard a second time.
  const handleFinish = async () => {
    setFinishing(true)
    try {
      await queryClient.refetchQueries({
        queryKey: queryKeys.household(session?.user.id ?? 'anonymous'),
        type: 'all',
      })
    } finally {
      setFinishing(false)
      navigate('/')
    }
  }

  const handleCopyCode = async () => {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareCode = async () => {
    if (!inviteCode) return
    if (navigator.share) {
      await navigator.share({
        title: 'Join my TwoPot household',
        text: `Join my household on TwoPot with code: ${inviteCode}`,
      })
    } else {
      await handleCopyCode()
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 480, mx: 'auto' }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Avatar src={profile?.avatar_url ?? undefined} sx={{ width: 72, height: 72 }}>
            {resolvedName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="headlineSmall">Welcome{resolvedName ? `, ${resolvedName}` : ''}</Typography>
          <TextField
            label="Display name"
            value={resolvedName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Button variant="contained" fullWidth onClick={() => setActiveStep(1)}>
            Next
          </Button>
        </Stack>
      )}

      {activeStep === 1 && (
        <Stack spacing={3}>
          <Typography variant="titleLarge">Your Household</Typography>
          <Stack direction="row" spacing={2}>
            <Card variant={choice === 'create' ? 'elevation' : 'outlined'} sx={{ flex: 1 }}>
              <CardActionArea onClick={() => setChoice('create')} sx={{ p: 1 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <GroupAddIcon color={choice === 'create' ? 'primary' : 'action'} />
                  <Typography variant="titleSmall">Create new household</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
            <Card variant={choice === 'join' ? 'elevation' : 'outlined'} sx={{ flex: 1 }}>
              <CardActionArea onClick={() => setChoice('join')} sx={{ p: 1 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <VpnKeyIcon color={choice === 'join' ? 'primary' : 'action'} />
                  <Typography variant="titleSmall">Join partner&apos;s household</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Stack>

          {choice === 'create' ? (
            <TextField
              label="Household name"
              placeholder="Our home"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
            />
          ) : (
            <TextField
              label="6-digit invite code"
              placeholder="123456"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
            />
          )}

          {error && (
            <Typography variant="bodyMedium" color="error">
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            fullWidth
            disabled={
              createHousehold.isPending ||
              joinHousehold.isPending ||
              (choice === 'join' && joinCode.length !== 6)
            }
            onClick={handleNextFromHousehold}
          >
            {choice === 'create' ? 'Create household' : 'Join household'}
          </Button>
        </Stack>
      )}

      {activeStep === 2 && choice === 'create' && (
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="titleLarge">Invite Partner</Typography>
          <Typography variant="displaySmall" sx={{ letterSpacing: '0.25em' }}>
            {inviteCode}
          </Typography>
          <Stack direction="row" spacing={2}>
            <IconButton onClick={handleCopyCode} aria-label="Copy invite code">
              <ContentCopyIcon />
            </IconButton>
            <IconButton onClick={handleShareCode} aria-label="Share invite code">
              <ShareIcon />
            </IconButton>
          </Stack>
          {copied && (
            <Typography variant="bodySmall" color="text.secondary">
              Copied to clipboard
            </Typography>
          )}
          <Typography variant="bodySmall" color="text.secondary">
            Code expires in 48h
          </Typography>
          <Button variant="contained" fullWidth onClick={() => setActiveStep(steps.length - 1)}>
            Continue
          </Button>
        </Stack>
      )}

      {activeStep === steps.length - 1 && (
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Grow in>
            <CheckCircle color="primary" sx={{ fontSize: 96 }} />
          </Grow>
          <Typography variant="headlineSmall">You&apos;re all set</Typography>
          <Button variant="contained" fullWidth onClick={() => void handleFinish()} disabled={finishing}>
            {finishing ? 'Loading…' : "Let's go"}
          </Button>
        </Stack>
      )}
    </Box>
  )
}
