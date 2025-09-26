import { test, expect } from '@playwright/test'

test('home loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Welcome to ERPv2')).toBeVisible()
})

test('B2B pages load', async ({ page }) => {
  await page.goto('/b2b/orders')
  await expect(page.getByText('B2B Orders')).toBeVisible()
  await page.goto('/b2b/orders/new')
  await expect(page.getByText('New B2B Order')).toBeVisible()
})
