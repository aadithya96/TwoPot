import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { SnackbarProvider } from 'notistack'
import { theme, darkTheme } from '@/lib/theme'
import { useUiStore } from '@/stores/uiStore'
import { router } from './App'

/** Applies the light/dark MUI theme based on the UI store's `darkMode` flag. */
export function ThemedApp() {
  const darkMode = useUiStore((state) => state.darkMode)
  return (
    <ThemeProvider theme={darkMode ? darkTheme : theme}>
      {/* enableColorScheme sets the document `color-scheme` from the active
          palette mode so native controls (buttons, inputs, scrollbars) use
          dark-appropriate defaults instead of black-on-dark text. */}
      <CssBaseline enableColorScheme />
      <SnackbarProvider maxSnack={3} autoHideDuration={4000}>
        <RouterProvider router={router} />
      </SnackbarProvider>
    </ThemeProvider>
  )
}
