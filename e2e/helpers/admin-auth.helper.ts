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

/**
 * Open the admin sidebar on mobile viewports.
 * On desktop the sidebar is always visible, so the toggle button is hidden.
 * This safely no-ops when the toggle is not present.
 */
export async function openAdminSidebar(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: /toggle sidebar/i });
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    // Wait for sidebar animation to complete
    await expect(page.getByRole('navigation', { name: /admin navigation/i })).toBeVisible();
  }
}
