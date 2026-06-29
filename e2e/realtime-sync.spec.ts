import { test, expect } from '@playwright/test'
import { createHousehold, createTestUser, joinHousehold, signIn } from './helpers/supabase'

test('an expense added by one partner appears for the other without a manual refresh', async ({ browser }) => {
  const owner = await createTestUser('rt-owner')
  const { inviteCode } = await createHousehold(owner, 'Realtime test household')
  const partner = await createTestUser('rt-partner')
  await joinHousehold(partner, inviteCode)

  const ownerContext = await browser.newContext()
  const partnerContext = await browser.newContext()

  try {
    const ownerPage = await ownerContext.newPage()
    const partnerPage = await partnerContext.newPage()

    await signIn(ownerPage, owner)
    await signIn(partnerPage, partner)

    await ownerPage.goto('/')
    await partnerPage.goto('/')

    // Wait for both dashboards to finish loading before writing. `postgres_changes`
    // only delivers events that occur after a channel is subscribed, so the
    // partner's RealtimeProvider must be mounted (its dashboard rendered) before
    // the owner adds the expense — otherwise the INSERT can race ahead of the
    // subscription and never reach the partner.
    await expect(ownerPage.getByRole('button', { name: 'Add expense' })).toBeVisible()
    await expect(partnerPage.getByRole('button', { name: 'Add expense' })).toBeVisible()

    await ownerPage.getByRole('button', { name: 'Add expense' }).click()
    const form = ownerPage.locator('form')
    await form.getByLabel('Amount').fill('99')
    await form.getByLabel('Description').fill('Realtime sync check')
    await form.getByRole('button', { name: 'Add expense' }).click()

    await expect(partnerPage.getByText('Realtime sync check')).toBeVisible({ timeout: 15_000 })
  } finally {
    await ownerContext.close()
    await partnerContext.close()
  }
})
