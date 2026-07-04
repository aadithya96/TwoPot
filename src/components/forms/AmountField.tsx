import { useState } from 'react'
import { InputAdornment, TextField, type TextFieldProps } from '@mui/material'
import { fromStorageAmount, toStorageAmount } from '@/lib/currency'

export interface AmountFieldProps
  extends Omit<TextFieldProps, 'value' | 'onChange' | 'type' | 'inputMode'> {
  /** Current amount in integer paise. */
  value: number
  /** Called with the new amount in integer paise whenever the display value changes. */
  onChange: (paise: number) => void
}

/** Numeric currency input that stores amounts as integer paise but displays/edits rupees. */
export function AmountField({ value, onChange, ...textFieldProps }: AmountFieldProps) {
  const [display, setDisplay] = useState(() => (value ? String(fromStorageAmount(value)) : ''))
  const [lastValue, setLastValue] = useState(value)

  // Re-sync the display string when `value` changes for a reason other than our own
  // onChange (e.g. form reset/initial values arriving asynchronously).
  if (value !== lastValue && toStorageAmount(display) !== value) {
    setLastValue(value)
    setDisplay(value ? String(fromStorageAmount(value)) : '')
  } else if (value !== lastValue) {
    setLastValue(value)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    if (!/^[0-9]*\.?[0-9]*$/.test(next)) return
    setDisplay(next)
    onChange(toStorageAmount(next))
  }

  return (
    <TextField
      {...textFieldProps}
      type="text"
      value={display}
      onChange={handleChange}
      slotProps={{
        input: {
          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
        },
        // inputMode must land on the <input> element itself (htmlInput slot) —
        // on the wrapper it's ignored and mobile keyboards stay alphabetic.
        htmlInput: { inputMode: 'decimal', pattern: '[0-9]*\\.?[0-9]*' },
        ...textFieldProps.slotProps,
      }}
    />
  )
}
