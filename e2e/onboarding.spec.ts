import { test, expect } from '@playwright/test'
import { createHousehold, createTestUser, signIn } from './helpers/supabase'

test.describe('Onboarding', () => {
  test('a new user can create a household and land on Home', async ({ page }) => {
    const user = await createTestUser('owner')
    await signIn(page, user)

    await page.goto('/')
    await expect(page).toHaveURL(/\/onboarding/)

    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel('Household name').fill('The Test House')
    await page.getByRole('button', { name: 'Create household' }).click()

    await expect(page.getByText(/^\d{6}$/)).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: "Let's go" }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('button', { name: 'Add expense' })).toBeVisible()
  })

  test('a second user can join a household via invite code', async ({ page }) => {
    const owner = await createTestUser('owner')
    const { inviteCode } = await createHousehold(owner, "Owner's household")

    const partner = await createTestUser('partner')
    await signIn(page, partner)

    await page.goto('/')
    await expect(page).toHaveURL(/\/onboarding/)

    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByText("Join partner's household").click()
    await page.getByLabel('6-digit invite code').fill(inviteCode)
    await page.getByRole('button', { name: 'Join household' }).click()

    await page.getByRole('button', { name: "Let's go" }).click()
    await expect(page).toHaveURL('/')
  })
})
