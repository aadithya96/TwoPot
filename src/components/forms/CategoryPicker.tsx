import { useState } from 'react'
import { Box, Chip, Drawer, Typography } from '@mui/material'
import type { Category } from '@/types/app'
import { useBackButton } from '@/hooks/useBackButton'
import { CategoryIcon } from '@/components/CategoryIcon'

export interface CategoryPickerProps {
  /** Categories available for the current household. */
  categories: Category[]
  /** Currently selected category id, or null if none selected. */
  value: string | null
  /** Called with the newly selected category id. */
  onChange: (categoryId: string) => void
}

/** Chip that opens a bottom-sheet grid for picking a single expense category. */
export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = categories.find((category) => category.id === value) ?? null

  useBackButton(open, () => setOpen(false))

  const handleSelect = (categoryId: string) => {
    onChange(categoryId)
    setOpen(false)
  }

  return (
    <>
      <Chip
        icon={selected ? <CategoryIcon icon={selected.icon} sx={{ color: `${selected.color} !important` }} /> : undefined}
        label={selected ? selected.name : 'Select category'}
        onClick={() => setOpen(true)}
        sx={{
          alignSelf: 'flex-start',
          ...(selected ? { borderColor: selected.color, borderWidth: 1, borderStyle: 'solid' } : {}),
        }}
        variant={selected ? 'outlined' : 'filled'}
      />
      <Drawer anchor="bottom" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ p: 2, paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          <Typography variant="titleMedium" sx={{ mb: 2 }}>
            Select category
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {categories.map((category) => (
              <Chip
                key={category.id}
                onClick={() => handleSelect(category.id)}
                variant={category.id === value ? 'filled' : 'outlined'}
                icon={
                  <CategoryIcon
                    icon={category.icon}
                    fontSize="small"
                    sx={{ color: `${category.color} !important` }}
                  />
                }
                label={category.name}
              />
            ))}
          </Box>
        </Box>
      </Drawer>
    </>
  )
}
