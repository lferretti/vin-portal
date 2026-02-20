import { test, expect } from '@playwright/test';

test.describe('Consumer Error Scenarios', () => {
  test.describe('Authentication errors', () => {
    test('invalid credentials show error message', async ({ page }) => {
      await page.goto('/authenticate');

      await page.getByPlaceholder(/enter at least the last 7/i).fill('WVWZZZ3CZW9999999');
      await page.getByPlaceholder(/enter your last name/i).fill('NOBODY');
      await page.getByPlaceholder('30301').fill('00000');

      await page.getByRole('button', { name: /continue/i }).click();

      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });
      await expect(
        page.getByText(/couldn't find an exact match/i)
      ).toBeVisible();

      await expect(page).toHaveURL(/\/authenticate/);
    });

    test('valid VIN with wrong last name shows error', async ({ page }) => {
      await page.goto('/authenticate');

      await page.getByPlaceholder(/enter at least the last 7/i).fill('WVWZZZ3CZW1234567');
      await page.getByPlaceholder(/enter your last name/i).fill('WRONGNAME');
      await page.getByPlaceholder('30301').fill('30301');

      await page.getByRole('button', { name: /continue/i }).click();

      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });
      await expect(page).toHaveURL(/\/authenticate/);
    });

    test('valid VIN with wrong ZIP shows error', async ({ page }) => {
      await page.goto('/authenticate');

      await page.getByPlaceholder(/enter at least the last 7/i).fill('WVWZZZ3CZW1234567');
      await page.getByPlaceholder(/enter your last name/i).fill('SMITH');
      await page.getByPlaceholder('30301').fill('99999');

      await page.getByRole('button', { name: /continue/i }).click();

      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });
      await expect(page).toHaveURL(/\/authenticate/);
    });
  });

  test.describe('Session and guard protection', () => {
    test('navigating to /review without auth redirects to /authenticate', async ({
      page,
    }) => {
      await page.goto('/review');

      // authGuard fires first, redirects to /authenticate
      await expect(page).toHaveURL(/\/authenticate/, { timeout: 5_000 });
    });

    test('navigating to /vin-entry without auth redirects to /authenticate', async ({
      page,
    }) => {
      await page.goto('/vin-entry');

      await expect(page).toHaveURL(/\/authenticate/, { timeout: 5_000 });
    });

    test('navigating to /verify-otp without OTP state redirects to /authenticate', async ({
      page,
    }) => {
      await page.goto('/verify-otp');

      await expect(page).toHaveURL(/\/authenticate/, { timeout: 5_000 });
    });
  });
});
