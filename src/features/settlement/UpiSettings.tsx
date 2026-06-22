import { useState } from 'react'
import { Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'
import { useUpdateUpiVpa } from '@/features/auth'
import { errorMessage } from '@/lib/errors'

export interface UpiSettingsProps {
  userId: string
  /** The user's currently stored UPI VPA, or null if not set. */
  upiVpa: string | null
}

/** Settings card letting a user set their UPI VPA so a partner can pay them with a one-tap deep link. */
export function UpiSettings({ userId, upiVpa }: UpiSettingsProps) {
  const [value, setValue] = useState(upiVpa ?? '')
  const updateUpiVpa = useUpdateUpiVpa()
  const { enqueueSnackbar } = useSnackbar()

  const handleSave = async () => {
    try {
      await updateUpiVpa.mutateAsync({ userId, upiVpa: value.trim() || null })
      enqueueSnackbar('UPI ID saved', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(errorMessage(error, 'Could not save UPI ID'), { variant: 'error' })
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="titleMedium" sx={{ mb: 1 }}>
          UPI ID
        </Typography>
        <Typography variant="bodyMedium" color="text.secondary" sx={{ mb: 1.5 }}>
          Add your UPI ID so your partner can settle up with a one-tap payment link.
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="name@bank"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={updateUpiVpa.isPending || value.trim() === (upiVpa ?? '')}
          >
            Save
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
