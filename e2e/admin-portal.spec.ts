import { test, expect } from '@playwright/test';
import { authenticateAdmin, openAdminSidebar } from './helpers/admin-auth.helper';

test.describe('Admin Portal @smoke', () => {
  test.describe('Authentication', () => {
    test('should redirect to login when accessing /admin without auth', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/admin\/login/);
    });

    test('should show role picker on login page', async ({ page }) => {
      await page.goto('/admin/login');
      await expect(page.getByText('Development Login')).toBeVisible();
      await expect(page.getByRole('button', { name: /security.*admin/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^support$/i })).toBeVisible();
    });

    test('should authenticate as admin and show dashboard', async ({ page }) => {
      await authenticateAdmin(page, 'admin');
      await openAdminSidebar(page);
      await expect(page.getByText('Dev Admin')).toBeVisible();
    });

    test('should authenticate as support and show dashboard', async ({ page }) => {
      await authenticateAdmin(page, 'support');
      await openAdminSidebar(page);
      await expect(page.getByText('Dev Support')).toBeVisible();
    });

    test('should logout and redirect to login', async ({ page }) => {
      await authenticateAdmin(page);
      await openAdminSidebar(page);
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  });

  test.describe('Contract Search', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateAdmin(page);
    });

    test('should search by external contract ID and show results', async ({ page }) => {
      await page.goto('/admin/search');
      await page.getByPlaceholder(/enter external id/i).fill('EXT-001');
      const searchBtn = page.getByRole('button', { name: /search/i });
      await searchBtn.scrollIntoViewIfNeeded();
      await searchBtn.click();
      await expect(page.getByText('EXT-001')).toBeVisible({ timeout: 5_000 });
    });

    test('should navigate to contract detail from search results', async ({ page }) => {
      await page.goto('/admin/search');
      await page.getByPlaceholder(/enter external id/i).fill('EXT-001');
      await page.getByRole('button', { name: /search/i }).click();
      await expect(page.getByText('EXT-001')).toBeVisible({ timeout: 5_000 });
      const viewLink = page.getByRole('link', { name: /view details/i }).first();
      await viewLink.scrollIntoViewIfNeeded();
      await viewLink.click();
      await expect(page).toHaveURL(/\/admin\/contract\//);
    });
  });

  test.describe('Contract Detail', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateAdmin(page);
    });

    test('should show contract information', async ({ page }) => {
      await page.goto('/admin/search');
      await page.getByPlaceholder(/enter external id/i).fill('EXT-001');
      await page.getByRole('button', { name: /search/i }).click();
      await expect(page.getByText('EXT-001')).toBeVisible({ timeout: 5_000 });
      const viewLink = page.getByRole('link', { name: /view details/i }).first();
      await viewLink.scrollIntoViewIfNeeded();
      await viewLink.click();
      await expect(page.getByText(/contract context id/i)).toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe('Dashboard Status Reference', () => {
    test.beforeEach(async ({ page }) => {
      await authenticateAdmin(page);
    });

    test('should show all 7 statuses', async ({ page }) => {
      // Scroll the status reference section into view
      const statusHeading = page.getByRole('heading', { name: /status reference/i });
      await statusHeading.scrollIntoViewIfNeeded();
      await expect(statusHeading).toBeVisible();

      await expect(page.getByText('NOT_USED')).toBeVisible();
      await expect(page.getByText('PENDING')).toBeVisible();
      await expect(page.getByText('COMMITTED_LOCKED')).toBeVisible();
      await expect(page.getByText('FAILED_INELIGIBLE')).toBeVisible();
      await expect(page.getByText('FAILED_DEPENDENCY')).toBeVisible();
      await expect(page.getByText('FAILED_VALIDATION')).toBeVisible();

      // CANCELLED may be below the fold; scroll to it.
      // Use exact: true to avoid matching the description text "Manually cancelled..."
      const cancelledBadge = page.getByText('CANCELLED', { exact: true });
      await cancelledBadge.scrollIntoViewIfNeeded();
      await expect(cancelledBadge).toBeVisible();
    });
  });
});
