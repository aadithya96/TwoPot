import { Box, Collapse, Slider, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'

export interface SplitSelectorValue {
  type: 'equal' | 'custom' | 'payer_covers'
  splitPctA?: number
}

export interface SplitSelectorProps {
  /** Current split type and (when custom) the percentage owed by household member A. */
  value: SplitSelectorValue
  /** Called with the updated split value whenever the type or percentage changes. */
  onChange: (value: SplitSelectorValue) => void
}

/** Toggle group for choosing how a shared expense is split, with a custom-percentage slider. */
export function SplitSelector({ value, onChange }: SplitSelectorProps) {
  const pctA = value.splitPctA ?? 50

  const handleTypeChange = (_event: React.MouseEvent<HTMLElement>, next: SplitSelectorValue['type'] | null) => {
    if (!next) return
    onChange(next === 'custom' ? { type: next, splitPctA: pctA } : { type: next })
  }

  const handleSliderChange = (_event: Event, next: number | number[]) => {
    const nextPct = Array.isArray(next) ? next[0] : next
    onChange({ type: 'custom', splitPctA: nextPct })
  }

  return (
    <Box>
      <ToggleButtonGroup
        value={value.type}
        exclusive
        onChange={handleTypeChange}
        fullWidth
        color="primary"
      >
        <ToggleButton value="equal">50/50</ToggleButton>
        <ToggleButton value="custom">Custom</ToggleButton>
        <ToggleButton value="payer_covers">I&apos;ll cover it</ToggleButton>
      </ToggleButtonGroup>
      <Collapse in={value.type === 'custom'}>
        <Box sx={{ px: 1, pt: 2 }}>
          <Typography variant="bodyMedium" sx={{ mb: 1 }}>
            You {pctA}% / Partner {100 - pctA}%
          </Typography>
          <Slider value={pctA} onChange={handleSliderChange} min={0} max={100} valueLabelDisplay="auto" />
        </Box>
      </Collapse>
    </Box>
  )
}
