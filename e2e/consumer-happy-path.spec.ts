import { test, expect } from '@playwright/test';

/**
 * Full happy-path E2E test for the consumer VIN-add flow.
 * Uses VIN ending in 1234567 / SMITH / 30301 (direct auth, no OTP).
 */

test.describe('Consumer Happy Path @smoke', () => {
  test('complete VIN add flow from landing to success result', async ({ page }) => {
    // ---- Step 1: Landing page ----
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /add an additional vehicle/i })
    ).toBeVisible();

    const getStarted = page.getByRole('link', { name: /get started/i });
    await expect(getStarted).toBeVisible();
    await getStarted.click();

    // ---- Step 2: Vehicle Lookup ----
    await expect(page).toHaveURL(/\/authenticate/);
    await expect(
      page.getByRole('heading', { name: /vehicle lookup/i })
    ).toBeVisible();

    await page.getByPlaceholder(/enter at least the last 7/i).fill('WVWZZZ3CZW1234567');
    await page.getByPlaceholder(/enter your last name/i).fill('SMITH');
    await page.getByPlaceholder('30301').fill('30301');

    await page.getByRole('button', { name: /continue/i }).click();

    // ---- Step 3: VIN Entry ----
    await expect(page).toHaveURL(/\/vin-entry/, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /enter vehicle vin/i })
    ).toBeVisible();

    // Enter the new VIN to add
    const vinInput = page.getByTestId('vin-input');
    await vinInput.fill('1HGCM82633A123456');
    await vinInput.blur();

    // Wait for decode and eligibility check
    await expect(page.getByTestId('vehicle-info')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/eligible/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /continue/i }).click();

    // ---- Step 4: Review ----
    await expect(page).toHaveURL(/\/review/, { timeout: 10_000 });
    await expect(
      page.getByRole('heading', { name: /review & confirm/i })
    ).toBeVisible();

    // Verify the new VIN (not the auth VIN) is shown on the review page
    await expect(page.getByText('1HGCM82633A123456')).toBeVisible();

    // Check the confirmation checkbox
    const checkbox = page.getByRole('checkbox');
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Click "Confirm & Add Vehicle"
    const confirmBtn = page.getByRole('button', { name: /confirm & add vehicle/i });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // ---- Step 5: Result ----
    await expect(page).toHaveURL(/\/result\//, { timeout: 15_000 });

    await expect(
      page.getByRole('heading', { name: /vehicle added successfully/i })
    ).toBeVisible({ timeout: 30_000 });

    // Verify document section is present
    await expect(page.getByTestId('document-section')).toBeVisible();
    await expect(page.getByTestId('download-pdf-btn')).toBeVisible();

    await expect(page.getByRole('link', { name: /done/i })).toBeVisible();
  });
});
