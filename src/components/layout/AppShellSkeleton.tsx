import { Box, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material'
import { APP_MAX_WIDTH } from '@/lib/layout'

/**
 * Mobile app-shell skeleton shown while the session/household (and the first
 * page's data) are still loading. It mirrors the real authenticated layout —
 * sticky app bar, the month-spend card, the "Recent expenses" list and the
 * bottom nav — so the page paints a stable, branded shell early and does not
 * reflow as React hydrates and content streams in. The static splash in
 * index.html mirrors this same structure so the HTML→React hand-off is seamless.
 *
 * The headings here are real, data-independent text, which gives the document
 * a contentful paint well before the per-user data arrives.
 */
export function AppShellSkeleton() {
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: 'primary.main',
          pt: 'env(safe-area-inset-top)',
          height: 'calc(56px + env(safe-area-inset-top))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: 2,
        }}
      >
        <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
      </Box>

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: APP_MAX_WIDTH,
            mx: 'auto',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Card elevation={1}>
            <CardContent>
              <Skeleton variant="text" width={120} height={20} />
              <Skeleton variant="text" width={160} height={44} sx={{ mt: 0.5 }} />
              <Skeleton variant="rounded" width="100%" height={8} sx={{ mt: 1.5, borderRadius: 4 }} />
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Skeleton variant="rounded" width={92} height={32} sx={{ borderRadius: 16 }} />
                <Skeleton variant="rounded" width={92} height={32} sx={{ borderRadius: 16 }} />
              </Stack>
            </CardContent>
          </Card>

          {/* Reserve the settlement and two-pots cards that sit above the list,
              so the "Recent expenses" section keeps the same vertical position
              from here through HomePage's own loading state. HomePage reserves
              the same slots, so the grid never reflows as their data streams in. */}
          <Skeleton variant="rounded" height={200} />
          <Skeleton variant="rounded" height={240} />

          <Box>
            <Typography variant="titleMedium">Recent expenses</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {[0, 1, 2].map((i) => (
                <Stack
                  key={i}
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: 'center', px: 2, py: 1.5 }}
                >
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                  <Skeleton variant="text" width={56} height={24} />
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          height: 'calc(80px + env(safe-area-inset-bottom))',
          pb: 'env(safe-area-inset-bottom)',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Stack key={i} spacing={0.5} sx={{ alignItems: 'center' }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width={36} height={12} />
          </Stack>
        ))}
      </Box>
    </Box>
  )
}
