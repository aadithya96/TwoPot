import { useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import { useSnackbar } from 'notistack'
import { useCategories } from '@/hooks/useCategories'
import { CategoryIcon } from '@/components/CategoryIcon'
import type { Category } from '@/types/app'
import { CategoryEditDialog } from './CategoryEditDialog'
import { useDeleteCategory } from './useCategoryMutations'

export interface CategoryManagerProps {
  /** Household whose categories are being managed. */
  householdId: string
}

/** Settings card listing the household's categories with add / edit / delete. */
export function CategoryManager({ householdId }: CategoryManagerProps) {
  const { data: categories, isLoading } = useCategories(householdId)
  const deleteCategory = useDeleteCategory()
  const { enqueueSnackbar } = useSnackbar()

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>(undefined)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const openCreate = () => {
    setEditing(undefined)
    setEditOpen(true)
  }
  const openEdit = (category: Category) => {
    setEditing(category)
    setEditOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteCategory.mutateAsync({ id: pendingDelete.id, householdId })
      enqueueSnackbar('Category deleted', { variant: 'success' })
      setPendingDelete(null)
    } catch {
      enqueueSnackbar('Could not delete category', { variant: 'error' })
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
          <CategoryOutlinedIcon />
          <Typography variant="titleMedium" sx={{ flex: 1 }}>
            Categories
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={openCreate}>
            Add
          </Button>
        </Stack>

        {isLoading ? (
          <CircularProgress size={20} sx={{ mt: 1 }} />
        ) : (
          <List disablePadding>
            {(categories ?? []).map((category) => (
              <ListItem
                key={category.id}
                disableGutters
                secondaryAction={
                  <Box>
                    <IconButton aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label={`Delete ${category.name}`} onClick={() => setPendingDelete(category)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: category.color }}>
                    <CategoryIcon icon={category.icon} sx={{ color: '#fff' }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={category.name} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>

      <CategoryEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        householdId={householdId}
        category={editing}
      />

      <Dialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <Box sx={{ p: 3, maxWidth: 340 }}>
          <Typography variant="titleMedium">Delete "{pendingDelete?.name}"?</Typography>
          <Typography variant="bodyMedium" color="text.secondary" sx={{ mt: 1 }}>
            Its budget will be removed and existing expenses will become uncategorised.
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
            <Button fullWidth onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="error"
              onClick={confirmDelete}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
            </Button>
          </Stack>
        </Box>
      </Dialog>
    </Card>
  )
}
