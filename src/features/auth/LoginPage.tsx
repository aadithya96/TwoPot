import { useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import Google from '@mui/icons-material/Google'
import { signInWithGoogle } from './useAuth'

/** Full-screen MD3 login page offering Google sign-in as the sole entry point. */
export function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await signInWithGoogle()
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 4,
      }}
    >
      <Stack spacing={1} sx={{ mb: 6, alignItems: 'center' }}>
        <Typography variant="displaySmall" component="h1">
          TwoPot
        </Typography>
        <Typography variant="bodyLarge" color="text.secondary" align="center">
          For two people. Expenses made simple.
        </Typography>
      </Stack>
      <Button
        variant="contained"
        fullWidth
        size="large"
        startIcon={<Google />}
        disabled={isSigningIn}
        onClick={handleSignIn}
        sx={{ maxWidth: 360 }}
      >
        Continue with Google
      </Button>
    </Box>
  )
}
