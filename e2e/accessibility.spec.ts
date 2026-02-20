import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { authenticateConsumer } from './helpers/auth.helper';

test.describe('@smoke Accessibility', () => {
  test('landing page has no critical or serious WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(violations).toEqual([]);
  });

  test('authenticate page has no critical or serious WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/authenticate');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(violations).toEqual([]);
  });

  test('VIN entry page has no critical or serious WCAG 2.1 AA violations', async ({ page }) => {
    await authenticateConsumer(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(violations).toEqual([]);
  });

  test('review page has no critical or serious WCAG 2.1 AA violations', async ({ page }) => {
    await authenticateConsumer(page);

    // Enter eligible VIN and proceed to review
    const vinInput = page.getByPlaceholder('1HGCM82633A123456');
    await vinInput.fill('1HGCM82633A123456');
    await vinInput.blur();

    await expect(page.getByTestId('vehicle-info')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/eligible/i)).toBeVisible({ timeout: 10_000 });

    const continueBtn = page.getByRole('button', { name: /continue/i });
    await expect(continueBtn).toBeEnabled({ timeout: 5_000 });
    await continueBtn.click();

    await expect(page).toHaveURL(/\/review/, { timeout: 10_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(violations).toEqual([]);
  });

  test('result page has no critical or serious WCAG 2.1 AA violations', async ({ page }) => {
    await authenticateConsumer(page);

    // Complete full VIN add flow
    const vinInput = page.getByPlaceholder('1HGCM82633A123456');
    await vinInput.fill('1HGCM82633A123456');
    await vinInput.blur();

    await expect(page.getByTestId('vehicle-info')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/eligible/i)).toBeVisible({ timeout: 10_000 });

    const continueBtn = page.getByRole('button', { name: /continue/i });
    await expect(continueBtn).toBeEnabled({ timeout: 5_000 });
    await continueBtn.click();

    await expect(page).toHaveURL(/\/review/, { timeout: 10_000 });
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /confirm & add vehicle/i }).click();

    await expect(page).toHaveURL(/\/result\//, { timeout: 15_000 });
    await expect(
      page.getByRole('heading', { name: /vehicle added successfully/i }),
    ).toBeVisible({ timeout: 30_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(violations).toEqual([]);
  });
});
