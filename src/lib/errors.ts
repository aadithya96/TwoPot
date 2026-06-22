/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * Supabase / PostgREST reject with a `PostgrestError` — a plain object with a
 * `message` field that is NOT an `instanceof Error`. A naive
 * `err instanceof Error ? err.message : fallback` therefore swallows the real
 * database/API error and shows only the fallback, which makes failures very
 * hard to diagnose. This helper handles both `Error` instances and any object
 * carrying a string `message` (PostgrestError, AuthError, etc.).
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message
  ) {
    return (error as { message: string }).message
  }
  return fallback
}
