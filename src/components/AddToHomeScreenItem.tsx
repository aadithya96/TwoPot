import { useState, useSyncExternalStore } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import InstallMobileOutlinedIcon from '@mui/icons-material/InstallMobileOutlined'
import {
  clearInstallPrompt,
  getInstallPrompt,
  isStandaloneDisplay,
  subscribeInstallPrompt,
} from '@/lib/installPrompt'

/**
 * "Add to Home Screen" entry for the Settings list. Uses the browser's native
 * install prompt when one was captured (Chrome/Edge on Android and desktop);
 * otherwise opens platform-appropriate manual instructions (Safari never
 * exposes a prompt). Hidden entirely when already running as an installed app.
 */
export function AddToHomeScreenItem() {
  const promptEvent = useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt, () => null)
  const [helpOpen, setHelpOpen] = useState(false)

  if (isStandaloneDisplay()) return null

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)

  const handleClick = async () => {
    if (!promptEvent) {
      setHelpOpen(true)
      return
    }
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') clearInstallPrompt()
  }

  return (
    <>
      <Divider component="li" />
      <ListItemButton
        onClick={() => {
          void handleClick()
        }}
      >
        <ListItemIcon>
          <InstallMobileOutlinedIcon />
        </ListItemIcon>
        <ListItemText
          primary="Add to Home Screen"
          secondary="Install TwoPot as an app — required for notifications on iPhone"
        />
      </ListItemButton>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)}>
        <DialogTitle>Add TwoPot to your Home Screen</DialogTitle>
        <DialogContent>
          {isIos ? (
            <Typography variant="bodyMedium">
              In Safari, tap the Share button, then choose &ldquo;Add to Home Screen&rdquo;. Opening
              TwoPot from the Home Screen also enables push notifications (iOS 16.4 or later).
            </Typography>
          ) : (
            <Typography variant="bodyMedium">
              Open your browser&rsquo;s menu and choose &ldquo;Install app&rdquo; or &ldquo;Add to
              Home Screen&rdquo;.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>Got it</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
