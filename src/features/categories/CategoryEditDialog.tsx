import { useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import type { Category } from '@/types/app'
import { CategoryIcon } from '@/components/CategoryIcon'
import { CATEGORY_ICON_NAMES } from '@/components/categoryIcons'
import { useCreateCategory, useUpdateCategory } from './useCategoryMutations'

/** Default icon name for a brand-new category. */
const DEFAULT_ICON = 'CategoryOutlined'

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
  const [icon, setIcon] = useState(category?.icon ?? DEFAULT_ICON)
  const [color, setColor] = useState(category?.color ?? COLOR_SWATCHES[0])

  // Re-seed the form when the dialog is (re)opened for a different category.
  const [syncedId, setSyncedId] = useState<string | null>(null)
  const currentId = category?.id ?? null
  if (open && currentId !== syncedId) {
    setSyncedId(currentId)
    setName(category?.name ?? '')
    setIcon(category?.icon ?? DEFAULT_ICON)
    setColor(category?.color ?? COLOR_SWATCHES[0])
  }

  const isPending = createCategory.isPending || updateCategory.isPending
  const trimmedName = name.trim()

  const handleSave = async () => {
    if (!trimmedName) return
    const input = { householdId, name: trimmedName, icon: icon || DEFAULT_ICON, color }
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {CATEGORY_ICON_NAMES.map((iconName) => {
                const isSelected = iconName === icon
                return (
                  <IconButton
                    key={iconName}
                    aria-label={iconName}
                    onClick={() => setIcon(iconName)}
                    sx={{
                      border: '1px solid',
                      borderColor: isSelected ? color : 'divider',
                      bgcolor: isSelected ? color : 'transparent',
                      color: isSelected ? '#fff' : 'text.secondary',
                      '&:hover': { bgcolor: isSelected ? color : 'action.hover' },
                    }}
                  >
                    <CategoryIcon icon={iconName} fontSize="small" />
                  </IconButton>
                )
              })}
            </Box>
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
