# E2E Tests

Playwright end-to-end tests running against the dev server with mock API enabled.

## Running

```bash
npm run e2e         # Full suite (headless Chromium)
npm run e2e:smoke   # Smoke tests only (--grep @smoke)
npm run e2e:headed  # Full suite with browser visible
```

Dev server runs on port 4299 (configured in `playwright.config.ts`).

## Selector Priority

Use accessibility-first locators. Fall back to `data-testid` only when no semantic selector exists:

1. `page.getByRole('button', { name: /submit/i })` — roles + accessible names
2. `page.getByPlaceholder(/enter your/i)` — form inputs
3. `page.getByText(/some text/i)` — visible text
4. `page.getByTestId('some-id')` — `data-testid` fallback

## Rules

- **No sleeps** — never use `waitForTimeout`. Use Playwright auto-waiting assertions like `await expect(locator).toBeVisible({ timeout: 5_000 })`
- **Tag smoke tests** with `@smoke` in the describe or test title so `--grep @smoke` picks them up
- **Mock API is always on** in dev mode — no real backend needed
- Tests run in `playwright.config.ts` projects (currently Chromium only)

## Test Credentials

The mock API accepts these credentials (from `MockApiService`):

| VIN (last 7) | Last Name | ZIP   | Result |
|---------------|----------|-------|--------|
| 1234567 | SMITH | 30301 | Direct auth (no OTP) |
| 7654321 | JONES | 10001 | OTP required |
| 0TP7654 | TESTUSER | 12345 | OTP required |
| LOCKED1 | LOCKED | 99999 | Contract locked |
| Other values | — | — | AUTH_NO_MATCH error |

Use a full 17-character VIN ending in the suffix above (e.g., `WVWZZZ3CZW1234567` for SMITH).
