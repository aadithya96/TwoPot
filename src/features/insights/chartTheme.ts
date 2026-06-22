import type { Theme } from '@mui/material/styles'

/**
 * Recharts renders SVG text and tooltips with hardcoded light-mode colours
 * (~#666 ticks, white tooltip) that become illegible on the dark theme's
 * #1C1B1F background. These helpers derive recharts style props from the
 * active MUI theme so charts stay readable in both light and dark mode.
 */

/** Tick style for `XAxis`/`YAxis`, driving the axis label text colour. */
export function axisTickStyle(theme: Theme) {
  return { fill: theme.palette.text.secondary, fontSize: 12 }
}

/** Stroke colour for axis lines and `CartesianGrid`. */
export function chartLineColor(theme: Theme): string {
  return theme.palette.divider
}

/** `wrapperStyle` for `Legend`, colouring the legend entry text. */
export function legendWrapperStyle(theme: Theme) {
  return { color: theme.palette.text.secondary, fontSize: 12 }
}

/** Tooltip styling props so the popup matches the surface and stays legible. */
export function tooltipStyles(theme: Theme) {
  return {
    contentStyle: {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 8,
      color: theme.palette.text.primary,
    },
    labelStyle: { color: theme.palette.text.secondary },
    itemStyle: { color: theme.palette.text.primary },
    cursor: { fill: theme.palette.action.hover },
  }
}
