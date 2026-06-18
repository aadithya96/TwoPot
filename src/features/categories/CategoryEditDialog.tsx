import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import type { Category } from '@/types/app'
import { useCreateCategory, useUpdateCategory } from './useCategoryMutations'

/** Suggested emoji icons offered as quick picks when editing a category. */
const EMOJI_SUGGESTIONS = ['🍽️', '🛒', '🚗', '⚡', '❤️', '🎬', '🏠', '✈️', '🎁', '💊', '📱', '💸']

/** Preset colour swatches for categories. */
const COLOR_SWATCHES = [
  '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899',
  '#10b981', '#f97316', '#6b7280', '#14b8a6', '#9ca3af',
]

export interface CategoryEditDialogProps {
  open: boolean
  onClose: () => void
  householdId: string
  /** Existing category to edit; omit to create a new one. */
  category?: Category
}

/** Dialog for creating or editing a category's name, emoji icon, and colour. */
export function CategoryEditDialog({ open, onClose, householdId, category }: CategoryEditDialogProps) {
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const { enqueueSnackbar } = useSnackbar()

  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? '🏷️')
  const [color, setColor] = useState(category?.color ?? COLOR_SWATCHES[0])

  // Re-seed the form when the dialog is (re)opened for a different category.
  const [syncedId, setSyncedId] = useState<string | null>(null)
  const currentId = category?.id ?? null
  if (open && currentId !== syncedId) {
    setSyncedId(currentId)
    setName(category?.name ?? '')
    setIcon(category?.icon ?? '🏷️')
    setColor(category?.color ?? COLOR_SWATCHES[0])
  }

  const isPending = createCategory.isPending || updateCategory.isPending
  const trimmedName = name.trim()

  const handleSave = async () => {
    if (!trimmedName) return
    const input = { householdId, name: trimmedName, icon: icon.trim() || '🏷️', color }
    try {
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, ...input })
      } else {
        await createCategory.mutateAsync(input)
      }
      onClose()
    } catch {
      enqueueSnackbar('Could not save category', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            fullWidth
          />

          <Box>
            <Typography variant="labelLarge" sx={{ mb: 1, display: 'block' }}>
              Icon
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <TextField
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                sx={{ width: 72 }}
                slotProps={{ htmlInput: { maxLength: 4, style: { textAlign: 'center', fontSize: '1.5rem' } } }}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    sx={{ minWidth: 36, p: 0.5, fontSize: '1.25rem' }}
                  >
                    {emoji}
                  </Button>
                ))}
              </Box>
            </Stack>
          </Box>

          <Box>
            <Typography variant="labelLarge" sx={{ mb: 1, display: 'block' }}>
              Colour
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {COLOR_SWATCHES.map((swatch) => (
                <Box
                  key={swatch}
                  role="button"
                  aria-label={`Colour ${swatch}`}
                  onClick={() => setColor(swatch)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: swatch,
                    cursor: 'pointer',
                    outline: color === swatch ? '2px solid' : 'none',
                    outlineColor: 'text.primary',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={isPending || !trimmedName}>
          {isPending ? <CircularProgress size={20} color="inherit" /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
