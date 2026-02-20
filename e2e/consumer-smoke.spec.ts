import { test, expect } from '@playwright/test';

test.describe('Consumer Portal Smoke Tests @smoke', () => {
  test('landing page loads and navigates to authenticate', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /add an additional vehicle/i })
    ).toBeVisible();

    const getStarted = page.getByRole('link', { name: /get started/i });
    await expect(getStarted).toBeVisible();
    await getStarted.click();

    await expect(page).toHaveURL(/\/authenticate/);
    await expect(
      page.getByRole('heading', { name: /vehicle lookup/i })
    ).toBeVisible();
  });

  test('authenticate with valid credentials navigates to vin-entry', async ({ page }) => {
    await page.goto('/authenticate');

    await page.getByPlaceholder(/enter at least the last 7/i).fill('WVWZZZ3CZW1234567');
    await page.getByPlaceholder(/enter your last name/i).fill('SMITH');
    await page.getByPlaceholder('30301').fill('30301');

    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/vin-entry/, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /enter vehicle vin/i })
    ).toBeVisible();
  });

  test('authenticate with invalid credentials does not navigate away', async ({ page }) => {
    await page.goto('/authenticate');

    await page.getByPlaceholder(/enter at least the last 7/i).fill('WVWZZZ3CZW9999999');
    await page.getByPlaceholder(/enter your last name/i).fill('NOBODY');
    await page.getByPlaceholder('30301').fill('00000');

    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveURL(/\/authenticate/);
    await expect(
      page.getByRole('heading', { name: /vehicle lookup/i })
    ).toBeVisible();
  });
});
