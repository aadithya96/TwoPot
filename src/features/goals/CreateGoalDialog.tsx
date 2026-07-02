import { useEffect, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { toStorageAmount } from '@/lib/currency'
import { GoalIcon } from './GoalIcon'
import { GOAL_ICON_KEYS } from './goalIcons'
import { useCreateGoal, type CreateGoalBacking } from './useGoals'
import { isValidUpiVpa, type GoalBackingType } from './backing'
import { fetchLatestNav, searchMfSchemes, type MfScheme } from './mfapi'

/** Preset color swatches for a savings goal's top strip. */
const COLOR_OPTIONS = [
  '#6750A4',
  '#B3261E',
  '#386A20',
  '#0061A4',
  '#9C4146',
  '#7D5260',
  '#006A6A',
  '#984061',
]

export interface CreateGoalDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close. */
  onClose: () => void
  /** Household the goal belongs to. */
  householdId: string
}

/**
 * Dialog for creating a new savings goal: name, target amount, optional deadline, icon, color,
 * and how the goal is backed — a plain ledger, a bank account reachable via UPI, or a mutual
 * fund scheme whose market value the goal will track.
 */
export function CreateGoalDialog({ open, onClose, householdId }: CreateGoalDialogProps) {
  const [name, setName] = useState('')
  const [amountDisplay, setAmountDisplay] = useState('')
  const [deadline, setDeadline] = useState('')
  const [icon, setIcon] = useState(GOAL_ICON_KEYS[0])
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [backingType, setBackingType] = useState<GoalBackingType>('manual')
  const [bankLabel, setBankLabel] = useState('')
  const [upiVpa, setUpiVpa] = useState('')
  const [schemeQuery, setSchemeQuery] = useState('')
  const [schemeOptions, setSchemeOptions] = useState<MfScheme[]>([])
  const [schemeSearching, setSchemeSearching] = useState(false)
  const [scheme, setScheme] = useState<MfScheme | null>(null)
  const [unitsDisplay, setUnitsDisplay] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  const createGoal = useCreateGoal()

  // Reset form fields whenever the dialog transitions from closed to open (React's
  // recommended "adjust state during render" pattern, avoiding a setState-in-effect).
  if (open && !wasOpen) {
    setWasOpen(true)
    setName('')
    setAmountDisplay('')
    setDeadline('')
    setIcon(GOAL_ICON_KEYS[0])
    setColor(COLOR_OPTIONS[0])
    setBackingType('manual')
    setBankLabel('')
    setUpiVpa('')
    setSchemeQuery('')
    setSchemeOptions([])
    setScheme(null)
    setUnitsDisplay('')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  // Debounced scheme search against the free AMFI mirror (MFAPI.in). Stale
  // options are hidden at render time (below) rather than cleared here, so the
  // effect never sets state synchronously.
  useEffect(() => {
    const query = schemeQuery.trim()
    if (backingType !== 'mutual_fund' || query.length < 3) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setSchemeSearching(true)
      searchMfSchemes(query, controller.signal)
        .then((schemes) => setSchemeOptions(schemes.slice(0, 20)))
        .catch(() => {
          // Aborted or network failure — keep whatever options we had.
        })
        .finally(() => setSchemeSearching(false))
    }, 300)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [backingType, schemeQuery])

  const visibleSchemeOptions = schemeQuery.trim().length < 3 ? [] : schemeOptions

  const upiValid = isValidUpiVpa(upiVpa)
  const units = unitsDisplay === '' ? 0 : Number.parseFloat(unitsDisplay)
  const backingValid =
    backingType === 'manual' ||
    (backingType === 'bank_account' && bankLabel.trim().length > 0 && upiValid) ||
    (backingType === 'mutual_fund' && scheme !== null && Number.isFinite(units) && units >= 0)
  const isValid = name.trim().length > 0 && toStorageAmount(amountDisplay) > 0 && backingValid

  const buildBacking = async (): Promise<CreateGoalBacking> => {
    if (backingType === 'bank_account') {
      return { type: 'bank_account', bankLabel: bankLabel.trim(), upiVpa: upiVpa.trim() }
    }
    if (backingType === 'mutual_fund' && scheme) {
      // Best effort: seed the NAV now so the goal starts at market value; the
      // hourly refresh-mf-nav job fills it in later if this fails.
      const latest = await fetchLatestNav(scheme.schemeCode).catch(() => null)
      return {
        type: 'mutual_fund',
        schemeCode: scheme.schemeCode,
        schemeName: scheme.schemeName,
        units,
        nav: latest?.nav ?? null,
        navDate: latest?.navDate ?? null,
      }
    }
    return { type: 'manual' }
  }

  const handleCreate = async () => {
    if (!isValid) return
    await createGoal.mutateAsync({
      householdId,
      name: name.trim(),
      icon,
      color,
      targetAmount: toStorageAmount(amountDisplay),
      deadline: deadline || null,
      backing: await buildBacking(),
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New savings goal</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Goal name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField
            label="Target amount"
            type="text"
            value={amountDisplay}
            onChange={(event) => {
              const next = event.target.value
              if (/^[0-9]*\.?[0-9]*$/.test(next)) setAmountDisplay(next)
            }}
            slotProps={{
              input: {
                inputMode: 'decimal',
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              },
            }}
          />
          <TextField
            label="Deadline (optional)"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <Box>
            <Typography variant="labelMedium" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Backed by
            </Typography>
            <ToggleButtonGroup
              value={backingType}
              exclusive
              onChange={(_event, value: GoalBackingType | null) => {
                if (value) setBackingType(value)
              }}
              fullWidth
              size="small"
            >
              <ToggleButton value="manual">Ledger only</ToggleButton>
              <ToggleButton value="bank_account">Bank / UPI</ToggleButton>
              <ToggleButton value="mutual_fund">Mutual fund</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {backingType === 'bank_account' && (
            <>
              <TextField
                label="Account label"
                placeholder="e.g. Joint savings account"
                value={bankLabel}
                onChange={(event) => setBankLabel(event.target.value)}
              />
              <TextField
                label="UPI ID"
                placeholder="name@bank"
                value={upiVpa}
                onChange={(event) => setUpiVpa(event.target.value)}
                error={upiVpa.length > 0 && !upiValid}
                helperText={
                  upiVpa.length > 0 && !upiValid
                    ? 'Enter a valid UPI ID like name@bank'
                    : 'Contributions will deep-link into your UPI app to transfer here'
                }
              />
            </>
          )}

          {backingType === 'mutual_fund' && (
            <>
              <Autocomplete
                options={visibleSchemeOptions}
                value={scheme}
                onChange={(_event, value) => setScheme(value)}
                inputValue={schemeQuery}
                onInputChange={(_event, value) => setSchemeQuery(value)}
                getOptionLabel={(option) => option.schemeName}
                isOptionEqualToValue={(option, value) => option.schemeCode === value.schemeCode}
                loading={schemeSearching}
                filterOptions={(options) => options}
                noOptionsText={schemeQuery.trim().length < 3 ? 'Type at least 3 characters' : 'No schemes found'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Fund scheme"
                    helperText="Search the same AMFI schemes you hold on Groww or Zerodha Coin"
                  />
                )}
              />
              <TextField
                label="Units already held (optional)"
                type="text"
                value={unitsDisplay}
                onChange={(event) => {
                  const next = event.target.value
                  if (/^[0-9]*\.?[0-9]*$/.test(next)) setUnitsDisplay(next)
                }}
                slotProps={{ input: { inputMode: 'decimal' } }}
                helperText="The goal tracks units × NAV, refreshed hourly"
              />
            </>
          )}

          <Box>
            <Typography variant="labelMedium" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Icon
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {GOAL_ICON_KEYS.map((key) => (
                <IconButton
                  key={key}
                  onClick={() => setIcon(key)}
                  sx={{
                    border: 2,
                    borderColor: icon === key ? 'primary.main' : 'transparent',
                    bgcolor: icon === key ? 'primary.light' : 'transparent',
                  }}
                  aria-label={key}
                >
                  <GoalIcon icon={key} />
                </IconButton>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="labelMedium" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Color
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map((swatch) => (
                <Box
                  key={swatch}
                  component="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`color ${swatch}`}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: swatch,
                    border: 3,
                    borderColor: color === swatch ? 'text.primary' : 'transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!isValid || createGoal.isPending}
          onClick={handleCreate}
          startIcon={createGoal.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
