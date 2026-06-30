import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useSnackbar } from 'notistack'
import Button from '@mui/material/Button'

export function UpdatePrompt() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    enqueueSnackbar('New version available', {
      variant: 'info',
      persist: true,
      action: (key) => (
        <Button
          size="small"
          color="inherit"
          onClick={() => {
            closeSnackbar(key)
            updateServiceWorker(true)
          }}
        >
          Reload
        </Button>
      ),
    })
  }, [needRefresh, enqueueSnackbar, closeSnackbar, updateServiceWorker])

  return null
}
