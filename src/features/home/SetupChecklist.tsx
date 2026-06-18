import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import CloseIcon from '@mui/icons-material/Close'

/** A single onboarding task shown in the {@link SetupChecklist}. */
export interface SetupStep {
  /** Stable identifier for the step. */
  key: string
  /** Short title of the task. */
  label: string
  /** One-line explanation of why it matters. */
  description: string
  /** Whether the user has already completed this task. */
  done: boolean
  /** Label for the action button shown while the task is incomplete. */
  actionLabel: string
  /** Invoked when the action button is pressed. */
  onAction: () => void
}

export interface SetupChecklistProps {
  /** Tasks to display, in order. */
  steps: SetupStep[]
  /** Called when the user dismisses the checklist via the close button. */
  onDismiss: () => void
}

/**
 * First-run "Get started" card that guides a new household through the core
 * setup tasks (add an expense, set a budget, create a goal, invite a partner),
 * showing progress and per-step actions.
 */
export function SetupChecklist({ steps, onDismiss }: SetupChecklistProps) {
  const completed = steps.filter((step) => step.done).length
  const progress = steps.length > 0 ? (completed / steps.length) * 100 : 0

  return (
    <Card elevation={1}>
      <CardContent>
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="titleMedium">Get started</Typography>
            <Typography variant="bodyMedium" color="text.secondary">
              {completed} of {steps.length} done
            </Typography>
          </Box>
          <IconButton aria-label="Dismiss setup checklist" size="small" onClick={onDismiss}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 6, borderRadius: 3, mt: 1.5 }}
        />

        <List sx={{ mt: 0.5 }}>
          {steps.map((step) => (
            <ListItem
              key={step.key}
              disableGutters
              secondaryAction={
                step.done ? null : (
                  <Button size="small" variant="text" onClick={step.onAction}>
                    {step.actionLabel}
                  </Button>
                )
              }
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {step.done ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <RadioButtonUncheckedIcon color="disabled" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={step.label}
                secondary={step.description}
                slotProps={{
                  primary: {
                    variant: 'bodyLarge',
                    sx: { textDecoration: step.done ? 'line-through' : 'none' },
                    color: step.done ? 'text.secondary' : 'text.primary',
                  },
                  secondary: { variant: 'bodySmall' },
                }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}
