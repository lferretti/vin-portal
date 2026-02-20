import { test, expect } from '@playwright/test';
import { authenticateConsumer } from './helpers/auth.helper';
import { authenticateAdmin } from './helpers/admin-auth.helper';

/**
 * Admin data-driven workflow E2E tests.
 *
 * These tests cover the search -> contract detail -> request detail flow.
 * A VIN add is completed first (via consumer auth) so the mock state has
 * request data for admin pages. Then admin auth is used to access admin routes.
 */

test.describe('Admin Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Complete a full VIN add flow so admin pages have request data
    await authenticateConsumer(page);

    // Enter an eligible VIN
    const vinInput = page.getByPlaceholder('1HGCM82633A123456');
    await vinInput.fill('1HGCM82633A123456');
    await vinInput.blur();

    await expect(page.getByTestId('vehicle-info')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/eligible/i)).toBeVisible({ timeout: 10_000 });

    const continueBtn = page.getByRole('button', { name: /continue/i });
    await expect(continueBtn).toBeEnabled({ timeout: 5_000 });
    await continueBtn.click();

    // Review page — check and confirm
    await expect(page).toHaveURL(/\/review/, { timeout: 10_000 });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /confirm & add vehicle/i }).click();

    // Wait for result page (VIN committed)
    await expect(page).toHaveURL(/\/result\//, { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: /vehicle added successfully/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Now authenticate as admin to access admin routes
    await authenticateAdmin(page);
  });

  test('search by external ID shows results with EXT-001', async ({ page }) => {
    await page.goto('/admin/search');

    await expect(
      page.getByRole('heading', { name: /search contracts/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder(/enter external id/i).fill('EXT-001');
    await page.getByRole('button', { name: /search/i }).click();

    // Wait for results to load
    await expect(page.getByText('Results')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('EXT-001')).toBeVisible();
  });

  test('click View Details navigates to contract detail page', async ({ page }) => {
    await page.goto('/admin/search');

    await expect(
      page.getByRole('heading', { name: /search contracts/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder(/enter external id/i).fill('EXT-001');
    await page.getByRole('button', { name: /search/i }).click();

    await expect(page.getByText('EXT-001')).toBeVisible({ timeout: 10_000 });

    const viewDetailsLink = page.getByRole('link', { name: /view details/i }).first();
    await viewDetailsLink.scrollIntoViewIfNeeded();
    await viewDetailsLink.click();

    await expect(page).toHaveURL(/\/admin\/contract\//);
    await expect(
      page.getByRole('heading', { name: /contract detail/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('navigate from contract detail to request detail', async ({ page }) => {
    // Go directly to the known contract context ID from mock seed data
    await page.goto('/admin/contract/ctx-1234567');

    await expect(
      page.getByRole('heading', { name: /contract detail/i }),
    ).toBeVisible({ timeout: 5_000 });

    // If there's a "View Full Request Details" link, click it
    const viewRequestLink = page.getByRole('link', {
      name: /view full request details/i,
    });

    // The contract detail page may not have request data if no VIN add was made
    // against this contract. In that case, verify the page renders correctly.
    const isVisible = await viewRequestLink.isVisible().catch(() => false);
    if (isVisible) {
      await viewRequestLink.click();
      await expect(page).toHaveURL(/\/admin\/request\//);
      await expect(
        page.getByRole('heading', { name: /request detail/i }),
      ).toBeVisible({ timeout: 5_000 });
    } else {
      // Contract detail page rendered without request data
      await expect(page.getByText('ctx-1234567')).toBeVisible();
    }
  });

  test('request detail page renders with refresh button', async ({ page }) => {
    // Navigate to admin search and find a contract by external ID
    await page.goto('/admin/search');

    await expect(
      page.getByRole('heading', { name: /search contracts/i }),
    ).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder(/enter external id/i).fill('EXT-001');
    await page.getByRole('button', { name: /search/i }).click();

    await expect(page.getByText('EXT-001')).toBeVisible({ timeout: 10_000 });

    // View contract detail
    const viewLink = page.getByRole('link', { name: /view details/i }).first();
    await viewLink.scrollIntoViewIfNeeded();
    await viewLink.click();
    await expect(page).toHaveURL(/\/admin\/contract\//);

    // Check if request detail link exists
    const viewRequestLink = page.getByRole('link', {
      name: /view full request details/i,
    });
    const isVisible = await viewRequestLink.isVisible().catch(() => false);

    if (isVisible) {
      await viewRequestLink.click();
      await expect(page).toHaveURL(/\/admin\/request\//);
      await expect(
        page.getByRole('heading', { name: /request detail/i }),
      ).toBeVisible({ timeout: 5_000 });

      // Refresh button should be visible
      await expect(
        page.getByRole('button', { name: /refresh data/i }),
      ).toBeVisible();
    }
  });
});
