import { test, expect } from '@playwright/test';

test.describe('Consumer OTP Flow', () => {
  test('authenticate with OTP-required credentials, verify code, and proceed to vin-entry', async ({
    page,
  }) => {
    await page.goto('/authenticate');

    await expect(
      page.getByRole('heading', { name: /vehicle lookup/i })
    ).toBeVisible();

    await page.getByPlaceholder(/enter at least the last 7/i).fill('WVWZZZ3CZW0TP7654');
    await page.getByPlaceholder(/enter your last name/i).fill('TESTUSER');
    await page.getByPlaceholder('30301').fill('12345');

    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/verify-otp/, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /verify your identity/i })
    ).toBeVisible();

    await expect(page.getByText(/\*\*\*-\*\*\*-1234/)).toBeVisible();

    const codeInput = page.getByPlaceholder('000000');
    await codeInput.fill('123456');

    await page.getByRole('button', { name: /verify code/i }).click();

    await expect(page).toHaveURL(/\/vin-entry/, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /enter vehicle vin/i })
    ).toBeVisible();
  });

  test('OTP flow continues through full VIN add process', async ({ page }) => {
    await page.goto('/authenticate');

    await page.getByPlaceholder(/enter at least the last 7/i).fill('WVWZZZ3CZW0TP7654');
    await page.getByPlaceholder(/enter your last name/i).fill('TESTUSER');
    await page.getByPlaceholder('30301').fill('12345');

    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/verify-otp/, { timeout: 10_000 });

    await page.getByPlaceholder('000000').fill('123456');
    await page.getByRole('button', { name: /verify code/i }).click();

    // ---- VIN Entry ----
    await expect(page).toHaveURL(/\/vin-entry/, { timeout: 10_000 });

    const vinInput = page.getByTestId('vin-input');
    await vinInput.fill('1HGCM82633A123456');
    await vinInput.blur();

    await expect(page.getByTestId('vehicle-info')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/eligible/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /continue/i }).click();

    // ---- Review ----
    await expect(page).toHaveURL(/\/review/, { timeout: 10_000 });

    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: /confirm & add vehicle/i }).click();

    // ---- Result ----
    await expect(page).toHaveURL(/\/result\//, { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: /vehicle added successfully/i })
    ).toBeVisible({ timeout: 30_000 });
  });

  test('invalid OTP code shows error and stays on verify page', async ({ page }) => {
    await page.goto('/authenticate');

    await page.getByPlaceholder(/enter at least the last 7/i).fill('WVWZZZ3CZW0TP7654');
    await page.getByPlaceholder(/enter your last name/i).fill('TESTUSER');
    await page.getByPlaceholder('30301').fill('12345');

    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/verify-otp/, { timeout: 10_000 });

    await page.getByPlaceholder('000000').fill('999999');
    await page.getByRole('button', { name: /verify code/i }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/invalid code/i)).toBeVisible();
    await expect(page).toHaveURL(/\/verify-otp/);
  });
});
