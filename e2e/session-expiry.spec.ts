import { test, expect } from '@playwright/test';
import { authenticateConsumer } from './helpers/auth.helper';

/**
 * Session expiry warning E2E tests.
 *
 * The SessionExpiryWarningComponent checks every 5 seconds for sessions
 * within 2 minutes of expiry. We manipulate sessionStorage to simulate
 * near-expiry conditions.
 */

test.describe('Session Expiry Warning', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateConsumer(page);
  });

  test('shows warning modal when session is near expiry', async ({ page }) => {
    // Manipulate sessionStorage to set expiry to 90 seconds from now
    await page.evaluate(() => {
      const raw = sessionStorage.getItem('vin_portal_session');
      if (!raw) return;
      const session = JSON.parse(raw);
      session.expiresAt = new Date(Date.now() + 90_000).toISOString();
      sessionStorage.setItem('vin_portal_session', JSON.stringify(session));
    });

    // Wait for the 5-second interval to detect near-expiry (max ~6s)
    await expect(page.getByText('Session Expiring Soon')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('dismiss button closes the warning modal', async ({ page }) => {
    // Set session near expiry
    await page.evaluate(() => {
      const raw = sessionStorage.getItem('vin_portal_session');
      if (!raw) return;
      const session = JSON.parse(raw);
      session.expiresAt = new Date(Date.now() + 90_000).toISOString();
      sessionStorage.setItem('vin_portal_session', JSON.stringify(session));
    });

    await expect(page.getByText('Session Expiring Soon')).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: /dismiss/i }).click();

    await expect(page.getByText('Session Expiring Soon')).not.toBeVisible();
  });

  test('start over button redirects to landing page and clears session', async ({
    page,
  }) => {
    // Set session near expiry
    await page.evaluate(() => {
      const raw = sessionStorage.getItem('vin_portal_session');
      if (!raw) return;
      const session = JSON.parse(raw);
      session.expiresAt = new Date(Date.now() + 90_000).toISOString();
      sessionStorage.setItem('vin_portal_session', JSON.stringify(session));
    });

    await expect(page.getByText('Session Expiring Soon')).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: /start over/i }).click();

    // Should navigate to landing page
    await expect(page).toHaveURL('/', { timeout: 10_000 });

    // Session should be cleared
    const sessionData = await page.evaluate(() =>
      sessionStorage.getItem('vin_portal_session'),
    );
    expect(sessionData).toBeNull();
  });
});
