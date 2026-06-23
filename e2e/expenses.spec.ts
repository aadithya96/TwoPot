import { test, expect } from '@playwright/test'
import { createHousehold, createTestUser, signIn } from './helpers/supabase'

test('adding a shared expense shows it on Home', async ({ page }) => {
  const user = await createTestUser('expense')
  await createHousehold(user, 'Expense test household')
  await signIn(page, user)

  await page.goto('/')
  await expect(page).toHaveURL('/')

  await page.getByRole('button', { name: 'Add expense' }).click()

  const form = page.locator('form')
  await form.getByLabel('Amount').fill('250')
  await form.getByLabel('Description').fill('Grocery run')
  await form.getByRole('button', { name: 'Add expense' }).click()

  await expect(page.getByText('Grocery run')).toBeVisible()
})
