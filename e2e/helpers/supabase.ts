import { existsSync } from 'node:fs'
import { createClient, type Session } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'

// Tests run via `pnpm test:e2e`, outside Vite, so `.env.local` isn't loaded
// automatically the way it is for `pnpm dev` — load it ourselves.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. E2E tests run against a local Supabase ' +
      'stack — see e2e/README.md.'
  )
}

export interface TestUser {
  email: string
  password: string
  session: Session
}

let counter = 0

/** Signs up a brand-new user against the local Supabase auth stack and returns their session. */
export async function createTestUser(namePrefix: string): Promise<TestUser> {
  counter += 1
  const email = `${namePrefix}-${Date.now()}-${counter}@example.com`
  const password = 'Test1234!'
  const client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) throw error
  if (!data.session) {
    throw new Error(
      'signUp did not return a session — local Supabase needs auth.email.enable_confirmations=false ' +
        '(see supabase/config.toml)'
    )
  }
  return { email, password, session: data.session }
}

function clientFor(user: TestUser) {
  const client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  return client.auth
    .setSession({
      access_token: user.session.access_token,
      refresh_token: user.session.refresh_token,
    })
    .then(() => client)
}

/** Creates a household owned by `user`, seeds default categories, and returns a fresh invite code. */
export async function createHousehold(
  user: TestUser,
  name: string
): Promise<{ householdId: string; inviteCode: string }> {
  const client = await clientFor(user)

  const { data: household, error: householdError } = await client
    .rpc('create_household', { name })
    .single<{ id: string; name: string }>()
  if (householdError) throw householdError

  const { error: seedError } = await client.rpc('seed_default_categories', { hid: household.id })
  if (seedError) throw seedError

  const { data: inviteCode, error: inviteError } = await client.rpc('generate_invite', {
    household_id: household.id,
  })
  if (inviteError) throw inviteError

  return { householdId: household.id, inviteCode: inviteCode as string }
}

/** Joins `user` into the household identified by `inviteCode`. */
export async function joinHousehold(user: TestUser, inviteCode: string): Promise<void> {
  const client = await clientFor(user)
  const { error } = await client.rpc('accept_invite', { code: inviteCode })
  if (error) throw error
}

/** Injects a Supabase session into localStorage before the app boots, bypassing the Google-OAuth-only login UI. */
export async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.addInitScript(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session))
    },
    { storageKey: 'twopot-auth', session: user.session }
  )
}
