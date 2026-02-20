import { test, expect } from '@playwright/test';
import { authenticateAdmin } from './helpers/admin-auth.helper';

/**
 * Admin dashboard E2E tests.
 *
 * Uses the admin dev-login flow via AdminSessionService.
 * All admin routes are protected by adminAuthGuard.
 */

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAdmin(page);
  });

  test('admin page renders with layout and sidebar', async ({ page }) => {
    // Admin layout should have sidebar with VIN Portal branding
    await expect(page.getByText('VIN Portal')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Admin Dashboard')).toBeVisible();

    // Sidebar navigation links should be visible
    await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Search Contracts', exact: true })).toBeVisible();
  });

  test('dashboard shows heading and quick actions', async ({ page }) => {
    // Dashboard heading
    await expect(
      page.getByRole('heading', { name: /dashboard/i })
    ).toBeVisible({ timeout: 5_000 });

    // Quick actions section
    await expect(
      page.getByRole('heading', { name: /quick actions/i })
    ).toBeVisible();

    // Search contracts link in quick actions
    await expect(page.getByRole('link', { name: /search contracts/i }).first()).toBeVisible();

    // Support Portal info card
    await expect(
      page.getByRole('heading', { name: /support portal/i })
    ).toBeVisible();

    // Status Reference card
    await expect(
      page.getByRole('heading', { name: /status reference/i })
    ).toBeVisible();
  });

  test('navigate from dashboard to contract search', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /dashboard/i })
    ).toBeVisible({ timeout: 5_000 });

    // Click "Search Contracts" in the sidebar
    await page.getByRole('link', { name: /search contracts/i }).first().click();

    await expect(page).toHaveURL(/\/admin\/search/);
    await expect(
      page.getByRole('heading', { name: /search contracts/i })
    ).toBeVisible();
  });

  test('contract search page renders form with fields', async ({ page }) => {
    await page.goto('/admin/search');

    await expect(
      page.getByRole('heading', { name: /search contracts/i })
    ).toBeVisible({ timeout: 5_000 });

    // Search form fields should be present
    await expect(page.getByPlaceholder(/enter contract number/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter external id/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter request id/i)).toBeVisible();

    // Search button should be present (disabled when no criteria entered)
    const searchButton = page.getByRole('button', { name: /search/i });
    await expect(searchButton).toBeVisible();
    await expect(searchButton).toBeDisabled();
  });

  test('contract search enables button when criteria entered', async ({ page }) => {
    await page.goto('/admin/search');

    await expect(
      page.getByRole('heading', { name: /search contracts/i })
    ).toBeVisible({ timeout: 5_000 });

    const searchButton = page.getByRole('button', { name: /search/i });
    await expect(searchButton).toBeDisabled();

    // Type into contract number field
    await page.getByPlaceholder(/enter contract number/i).fill('CONTRACT-001');

    // Search button should now be enabled
    await expect(searchButton).toBeEnabled();
  });
});
