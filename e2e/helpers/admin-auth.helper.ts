import { expect, Page } from '@playwright/test';

/**
 * Authenticate via the admin dev-login flow using the mock API.
 * Navigates to /admin/login, clicks the role button, and waits
 * for redirect to /admin (the dashboard).
 */
export async function authenticateAdmin(
  page: Page,
  role: 'admin' | 'support' = 'admin',
): Promise<void> {
  await page.goto('/admin/login');

  // Click the appropriate role button
  const buttonName = role === 'admin' ? /security.*admin/i : /^support$/i;
  await page.getByRole('button', { name: buttonName }).click();

  // Wait for redirect to admin dashboard
  await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
}
