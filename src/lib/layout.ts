/**
 * Maximum width (in px) of the app's content column. The UI is mobile-first, so
 * on wider (desktop) viewports the content is centered within this width rather
 * than stretching edge-to-edge.
 */
export const APP_MAX_WIDTH = 600

/**
 * `sx` `right` value for floating action buttons so they align with the right
 * edge of the centered content column (16px inset) instead of the viewport edge.
 * Clamps to a 16px inset on narrow screens where the column fills the viewport.
 */
export const fabRightOffset = `max(16px, calc(50% - ${APP_MAX_WIDTH / 2}px + 16px))`
