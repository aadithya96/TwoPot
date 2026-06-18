import { useId, useRef, useState } from 'react'
import { Box, IconButton, LinearProgress, Avatar } from '@mui/material'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import { useHouseholdStore } from '@/stores/householdStore'
import { useUploadReceipt } from './useReceiptUpload'

/** Props for {@link ReceiptUploader}: the current receipt URL (or null) and a change handler. */
export interface ReceiptUploaderProps {
  value: string | null
  onChange: (url: string | null) => void
}

/**
 * Camera-capture button for attaching a receipt photo to an expense: compresses the
 * chosen image, uploads it via `useUploadReceipt`, and shows a thumbnail preview once done.
 */
export function ReceiptUploader({ value, onChange }: ReceiptUploaderProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const householdId = useHouseholdStore((state) => state.householdId)
  const { mutate, isPending } = useUploadReceipt()
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !householdId) return

    setError(null)
    mutate(
      { householdId, file },
      {
        onSuccess: (url) => onChange(url),
        onError: () => setError('Upload failed'),
      }
    )
  }

  const handleRemove = () => {
    onChange(null)
  }

  if (value) {
    return (
      <Box sx={{ position: 'relative', width: 64, height: 64 }}>
        <Avatar
          src={value}
          variant="rounded"
          sx={{ width: 64, height: 64 }}
          alt="Receipt thumbnail"
        />
        <IconButton
          aria-label="Remove receipt photo"
          size="small"
          onClick={handleRemove}
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': { bgcolor: 'background.paper' },
          }}
        >
          <ClearOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>
    )
  }

  return (
    <Box sx={{ width: 64 }}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFileChange}
      />
      <IconButton
        aria-label="Add receipt photo"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
      >
        <PhotoCameraOutlinedIcon />
      </IconButton>
      {isPending && <LinearProgress sx={{ width: 48 }} />}
      {error && (
        <Box component="span" sx={{ color: 'error.main', fontSize: '0.75rem' }}>
          {error}
        </Box>
      )}
    </Box>
  )
}
