import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import SearchIcon from '@mui/icons-material/Search'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import ClearIcon from '@mui/icons-material/Clear'
import { useHouseholdStore } from '@/stores/householdStore'
import { formatMonth, formatRelativeDate, monthKey, shiftMonth } from '@/lib/dates'
import { ExpenseRow } from './ExpenseRow'
import { AddExpenseSheet } from './AddExpenseSheet'
import { useExpenses } from './useExpenses'
import { CategoryIcon } from '@/components/CategoryIcon'
import type { Category } from '@/types/app'

export interface ExpenseListProps {
  /** Household whose expenses should be shown. */
  householdId: string
  /** Id of the user currently viewing the list. */
  currentUserId: string
  /** Categories available for the household, passed to rows and the add sheet. */
  categories: Category[]
}

type OwnerFilter = 'all' | 'shared' | 'personal'

/** Month-navigable list of expenses with search/filter controls, grouped by date. */
export function ExpenseList({ householdId, currentUserId, categories }: ExpenseListProps) {
  const [month, setMonth] = useState(() => monthKey())
  const [addOpen, setAddOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [payerId, setPayerId] = useState<string>('all')
  const [owner, setOwner] = useState<OwnerFilter>('all')
  const { data: expenses, isLoading } = useExpenses(householdId, month)
  const members = useHouseholdStore((state) => state.members)

  const hasActiveFilters = query.trim() !== '' || categoryId !== 'all' || payerId !== 'all' || owner !== 'all'

  const clearFilters = () => {
    setQuery('')
    setCategoryId('all')
    setPayerId('all')
    setOwner('all')
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (expenses ?? []).filter((expense) => {
      if (categoryId !== 'all' && expense.category_id !== categoryId) return false
      if (payerId !== 'all' && expense.paid_by !== payerId) return false
      if (owner !== 'all' && expense.owner !== owner) return false
      if (needle) {
        const haystack = [expense.description, expense.notes ?? '', expense.category?.name ?? '']
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
  }, [expenses, query, categoryId, payerId, owner])

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filtered>()
    for (const expense of filtered) {
      const list = groups.get(expense.date) ?? []
      list.push(expense)
      groups.set(expense.date, list)
    }
    return Array.from(groups.entries())
  }, [filtered])

  const monthTotal = useMemo(() => (expenses ?? []).length, [expenses])

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', py: 1 }}>
        <IconButton onClick={() => setMonth((current) => shiftMonth(current, -1))} aria-label="Previous month">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="titleMedium">{formatMonth(month)}</Typography>
        <IconButton onClick={() => setMonth((current) => shiftMonth(current, 1))} aria-label="Next month">
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      {monthTotal > 0 && (
        <Stack spacing={1.5} sx={{ mb: 1 }}>
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search description, notes, or category"
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <IconButton aria-label="Clear search" size="small" onClick={() => setQuery('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap', alignItems: 'center' }}
          >
            <TextField
              select
              size="small"
              label="Category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              sx={{ minWidth: 150, flex: { xs: 1, sm: 'none' } }}
            >
              <MenuItem value="all">All categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <CategoryIcon
                      icon={category.icon}
                      fontSize="small"
                      sx={{ color: category.color }}
                    />
                    <span>{category.name}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            {members.length > 1 && (
              <TextField
                select
                size="small"
                label="Paid by"
                value={payerId}
                onChange={(event) => setPayerId(event.target.value)}
                sx={{ minWidth: 130, flex: { xs: 1, sm: 'none' } }}
              >
                <MenuItem value="all">Anyone</MenuItem>
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.display_name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <ToggleButtonGroup
              size="small"
              exclusive
              value={owner}
              onChange={(_event, next: OwnerFilter | null) => next && setOwner(next)}
              aria-label="Filter by expense type"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="shared">Shared</ToggleButton>
              <ToggleButton value="personal">Personal</ToggleButton>
            </ToggleButtonGroup>

            {hasActiveFilters && (
              <Button size="small" onClick={clearFilters} startIcon={<ClearIcon fontSize="small" />}>
                Clear
              </Button>
            )}
          </Stack>
        </Stack>
      )}

      {isLoading && (
        <Stack spacing={0.5} sx={{ px: 2 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      )}

      {!isLoading && monthTotal === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          <Typography variant="bodyLarge" color="text.secondary" sx={{ mt: 1 }}>
            No expenses yet
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => setAddOpen(true)}>
            Add your first
          </Button>
        </Box>
      )}

      {!isLoading && monthTotal > 0 && grouped.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <SearchOffIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          <Typography variant="bodyLarge" color="text.secondary" sx={{ mt: 1 }}>
            No expenses match your filters
          </Typography>
          <Button variant="text" sx={{ mt: 1 }} onClick={clearFilters}>
            Clear filters
          </Button>
        </Box>
      )}

      {!isLoading &&
        grouped.map(([date, dayExpenses]) => (
          <Box key={date}>
            <Typography variant="labelLarge" color="text.secondary" sx={{ px: 2, py: 1 }}>
              {formatRelativeDate(date)}
            </Typography>
            {dayExpenses?.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                currentUserId={currentUserId}
                householdId={householdId}
                month={month}
                categories={categories}
              />
            ))}
          </Box>
        ))}

      <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} categories={categories} />
    </Box>
  )
}
