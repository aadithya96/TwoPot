import { test, expect } from '@playwright/test'
import { createHousehold, createTestUser, joinHousehold, signIn } from './helpers/supabase'

test('a shared expense paid by one partner surfaces a settle-up card for the other', async ({ page }) => {
  const owner = await createTestUser('settle-owner')
  const { inviteCode } = await createHousehold(owner, 'Settle test household')
  const partner = await createTestUser('settle-partner')
  await joinHousehold(partner, inviteCode)

  await signIn(page, owner)
  await page.goto('/')

  await page.getByRole('button', { name: 'Add expense' }).click()
  const form = page.locator('form')
  await form.getByLabel('Amount').fill('1000')
  await form.getByLabel('Description').fill('Rent share')
  await form.getByRole('button', { name: 'Add expense' }).click()
  await expect(page.getByText('Rent share')).toBeVisible()

  // The settlement card is computed from a query not invalidated by the
  // add-expense mutation or by the realtime "expenses" subscription, so a
  // reload is needed to see the freshly computed balance.
  await page.reload()

  await expect(page.getByText(/owes/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as Settled' })).toBeVisible()
})
