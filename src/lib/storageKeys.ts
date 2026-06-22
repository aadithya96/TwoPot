/** Centralised localStorage keys, so producers and consumers can't drift. */

/**
 * Set to '1' once the user dismisses the home "Get started" checklist. Removing
 * it (e.g. after a member is removed) lets the checklist resurface so the
 * re-opened "Invite your partner" step is shown again.
 */
export const SETUP_DISMISSED_KEY = 'twopot:setupDismissed'
