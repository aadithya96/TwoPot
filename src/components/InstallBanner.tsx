import { useState } from 'react'
import { Alert, AlertTitle, Button } from '@mui/material'
import { useInstallState } from '@/hooks/useInstallState'

const DISMISS_KEY = 'twopot-install-banner-dismissed'

/**
 * Dismissible banner prompting the user to install the PWA, with iOS
 * (manual "Add to Home Screen") vs Android/Chrome (native prompt) copy.
 */
export function InstallBanner() {
  const { isInstalled, canPromptInstall, promptInstall, platform } = useInstallState()
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === 'true'
  )

  const handleDismiss = (): void => {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  if (isInstalled || dismissed || platform === 'other') return null
  if (platform === 'android' && !canPromptInstall) return null

  return (
    <Alert
      severity="info"
      onClose={handleDismiss}
      action={
        platform === 'android' ? (
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              void promptInstall()
            }}
          >
            Install
          </Button>
        ) : undefined
      }
      sx={{ borderRadius: 0 }}
    >
      <AlertTitle>Install TwoPot</AlertTitle>
      {platform === 'ios'
        ? 'Tap the Share icon, then "Add to Home Screen" for the full app experience.'
        : 'Add TwoPot to your home screen for quick, full-screen access.'}
    </Alert>
  )
}
