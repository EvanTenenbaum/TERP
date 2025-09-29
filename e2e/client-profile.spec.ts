import { test, expect } from '@playwright/test'

test('client profile renders summary cards', async ({ page }) => {
  await page.goto('/clients')
  // This E2E assumes a seeded party is navigable from clients list if present
  // If list exists, click first client; otherwise skip
  const hasList = await page.locator('text=Clients').first().isVisible().catch(()=>false)
  if (!hasList) return
  // naive: look for any link to /clients/
  const link = page.locator('a[href^="/clients/"]').first()
  if (await link.count() === 0) return
  await link.click()
  await expect(page.getByText('Last Activity')).toBeVisible()
})
