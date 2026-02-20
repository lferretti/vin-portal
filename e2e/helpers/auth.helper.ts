import { expect, Page } from '@playwright/test';

interface AuthenticateOptions {
  vin?: string;
  lastName?: string;
  zip?: string;
}

/**
 * Authenticate via the consumer flow using the mock API.
 * Defaults to a VIN ending in 1234567 / SMITH / 30301 (direct auth, no OTP).
 * Navigates to /authenticate, fills credentials, clicks continue,
 * and waits for redirect to /vin-entry.
 */
export async function authenticateConsumer(
  page: Page,
  opts?: AuthenticateOptions,
): Promise<void> {
  const vin = opts?.vin ?? 'WVWZZZ3CZW1234567';
  const lastName = opts?.lastName ?? 'SMITH';
  const zip = opts?.zip ?? '30301';

  await page.goto('/authenticate');

  await page.getByPlaceholder(/enter at least the last 7/i).fill(vin);
  await page.getByPlaceholder(/enter your last name/i).fill(lastName);
  await page.getByPlaceholder('30301').fill(zip);

  await page.getByRole('button', { name: /continue/i }).click();

  await expect(page).toHaveURL(/\/vin-entry/, { timeout: 10_000 });
}
