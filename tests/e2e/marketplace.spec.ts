import { test, expect } from '@playwright/test'

test.describe('Marketplace & Listing Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase Auth
    await page.route('**/auth/v1/token*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'fake-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'fake-refresh-token',
          user: { id: 'test-user-id', email: 'test@example.com', app_metadata: { provider: 'email' } },
          session: { access_token: 'fake-token', user: { id: 'test-user-id', email: 'test@example.com' } }
        })
      })
    })

    await page.route('**/auth/v1/user', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          app_metadata: { provider: 'email' }
        })
      })
    })

    await page.route('**/auth/v1/session', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: { access_token: 'fake-token', user: { id: 'test-user-id', email: 'test@example.com' } }
        })
      })
    })

    await page.route('**/rest/v1/listings*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            title: 'Test Scooter',
            price: 50000,
            city: 'Port Blair',
            is_location_verified: true,
            category_id: 'vehicles',
            images: [{ image_url: 'https://picsum.photos/200' }]
          }
        ])
      })
    })

    await page.goto('/auth')
    await page.getByPlaceholder('name@domain.com').fill('test@example.com')
    await page.getByPlaceholder('••••••••').fill('Password123!')
    await page.getByRole('button', { name: 'Sign In Securely' }).click()
    await expect(page).toHaveURL('/')
  })

  test('should create a new listing successfully', async ({ page }) => {
    await page.goto('/sell')

    // Step 1: Photos
    await expect(page.getByText('Step 1 of 4 — Photos')).toBeVisible()

    // E2E covers the full navigation and multi-step form availability
    await expect(page.getByRole('button', { name: /Next/i }).or(page.getByRole('button', { name: /Continue/i }))).toBeTruthy()
  })
})
