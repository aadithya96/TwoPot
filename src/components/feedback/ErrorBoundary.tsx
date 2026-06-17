import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Box, Card, CardContent, Typography, Button } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'

export interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches render errors in its subtree and shows an MD3-styled error card
 * with a retry button that resets the boundary so the subtree remounts.
 * Class component required: React error boundaries are not expressible
 * via hooks.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('TwoPot ErrorBoundary caught an error', error, info)
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Card sx={{ maxWidth: 360, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ErrorOutlineIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="titleMedium" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="bodyMedium" color="text.secondary" sx={{ mb: 2 }}>
                Please try again.
              </Typography>
              <Button variant="contained" onClick={this.handleRetry}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </Box>
      )
    }

    return this.props.children
  }
}
