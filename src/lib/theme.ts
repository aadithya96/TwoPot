import { createTheme } from '@mui/material/styles'
import './typography.d.ts'

/** MD3 light theme, seed colour #6750A4. */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6750A4', light: '#EADDFF', dark: '#21005D', contrastText: '#FFFFFF' },
    secondary: { main: '#625B71', light: '#E8DEF8', dark: '#1D192B', contrastText: '#FFFFFF' },
    error: { main: '#B3261E', light: '#F9DEDC', dark: '#601410', contrastText: '#FFFFFF' },
    background: { default: '#FFFBFE', paper: '#FFFBFE' },
    text: { primary: '#1C1B1F', secondary: '#49454F' },
  },
  typography: {
    fontFamily: '"Roboto", sans-serif',
    displayLarge: { fontSize: '3.5625rem', fontWeight: 400, lineHeight: 1.12, letterSpacing: '-0.015625em' },
    displayMedium: { fontSize: '2.8125rem', fontWeight: 400, lineHeight: 1.16 },
    displaySmall: { fontSize: '2.25rem', fontWeight: 400, lineHeight: 1.22 },
    headlineLarge: { fontSize: '2rem', fontWeight: 400, lineHeight: 1.25 },
    headlineMedium: { fontSize: '1.75rem', fontWeight: 400, lineHeight: 1.29 },
    headlineSmall: { fontSize: '1.5rem', fontWeight: 400, lineHeight: 1.33 },
    titleLarge: { fontSize: '1.375rem', fontWeight: 400, lineHeight: 1.27 },
    titleMedium: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.009375em' },
    titleSmall: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.43, letterSpacing: '0.00625em' },
    bodyLarge: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.03125em' },
    bodyMedium: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.43, letterSpacing: '0.015625em' },
    bodySmall: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.33, letterSpacing: '0.025em' },
    labelLarge: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.43, letterSpacing: '0.00625em' },
    labelMedium: { fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.33, letterSpacing: '0.03125em' },
    labelSmall: { fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1.45, letterSpacing: '0.03125em' },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiTypography: {
      // Custom MD3 variants have no built-in element mapping, so MUI would
      // render them as inline <span>. Map them to block-level elements (labels
      // stay inline) so headings/body text stack instead of flowing together.
      defaultProps: {
        variantMapping: {
          displayLarge: 'h1',
          displayMedium: 'h1',
          displaySmall: 'h2',
          headlineLarge: 'h2',
          headlineMedium: 'h3',
          headlineSmall: 'h3',
          titleLarge: 'h4',
          titleMedium: 'h6',
          titleSmall: 'h6',
          bodyLarge: 'p',
          bodyMedium: 'p',
          bodySmall: 'p',
          labelLarge: 'span',
          labelMedium: 'span',
          labelSmall: 'span',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 20, textTransform: 'none', minHeight: 40 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16 },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: { borderRadius: 16, width: 56, height: 56 },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { height: 80 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRadius: '28px 28px 0 0' },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
      styleOverrides: {
        root: { '& input': { fontSize: '1rem' } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
})

/** MD3 dark theme, same shape overrides with dark-mode palette tokens. */
export const darkTheme = createTheme({
  ...theme,
  palette: {
    ...theme.palette,
    mode: 'dark',
    primary: { main: '#D0BCFF', light: '#EADDFF', dark: '#381E72', contrastText: '#371E73' },
    secondary: { main: '#CCC2DC', light: '#E8DEF8', dark: '#332D41', contrastText: '#332D41' },
    background: { default: '#1C1B1F', paper: '#1C1B1F' },
    text: { primary: '#E6E1E5', secondary: '#CAC4D0' },
  },
})
