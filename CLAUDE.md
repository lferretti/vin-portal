# VIN Portal

Angular 21 SPA for adding an additional vehicle to a warranty contract. Hosted on S3 + CloudFront with a NestJS backend API at `/api/v1`.

## Quick Commands

```bash
npm start           # Dev server (port 4200, mock API enabled)
npm run build       # Production build → dist/vin-portal/browser/
npm run lint        # ESLint (angular-eslint + typescript-eslint)
npm run typecheck   # tsc --noEmit
npm test            # Jest unit tests
npm run test:ci     # Jest with coverage (CI mode)
npm run e2e         # Playwright full suite
npm run e2e:smoke   # Playwright @smoke-tagged tests only
npm run e2e:headed  # Playwright with browser visible
```

## Architecture

- **`src/app/core/`** — Services, guards, interceptors, models (singleton, app-wide)
- **`src/app/shared/`** — Reusable components, validators, utils (no business logic)
- **`src/app/features/consumer/`** — Consumer wizard: landing → vehicle lookup → review → result
- **`src/app/features/admin/`** — Admin dashboard (lazy-loaded under `/admin`)
- **`src/environments/`** — Build-time config (dev with mock API, prod with real API + Datadog RUM)

## Key Conventions

- **Change detection:** `OnPush` on all components
- **State management:** Angular signals (`signal()`, `computed()`)
- **Components:** Standalone, inline templates, `input()`/`output()` signal APIs
- **Styling:** Tailwind CSS 4 utility classes in templates + custom design-system classes in `src/styles.css` (`form-input`, `otp-input`, `card`, `page-card`, etc.). See `src/app/shared/CLAUDE.md` for the full class vocabulary and rules.
- **Types:** No `any` — use `unknown` + type narrowing
- **Barrel exports:** Every `core/` and `shared/` subdirectory has an `index.ts`
- **Interceptor chain:** mock → correlation → auth → error (order matters)

## Testing

- **Unit tests:** Jest via `@angular-builders/jest` + `jest-preset-angular`
- **E2E tests:** Playwright (Chromium only), dev server on port 4299
- **E2E selector priority:** `getByRole` > `getByPlaceholder` > `getByText` > `data-testid`
- **Tag smoke tests** with `@smoke` in the describe/test title for `--grep` filtering
- **No sleeps** in E2E — use Playwright auto-waiting and assertions

## Mock API Test Credentials

Dev mode (`features.mockApi: true`) enables an in-app mock backend:

| VIN (last 7) | Last Name | ZIP   | Behavior |
|---------------|----------|-------|----------|
| 1234567 | SMITH | 30301 | Direct auth (no OTP) |
| 7654321 | JONES | 10001 | OTP required |
| 0TP7654 | TESTUSER | 12345 | OTP required |
| LOCKED1 | LOCKED | 99999 | Contract locked |
| Other values | — | — | AUTH_NO_MATCH error |

Use a full 17-character VIN ending in the suffix above (e.g., `WVWZZZ3CZW1234567` for SMITH).

## Environment Config

Environment files are in `src/environments/`. The `Environment` interface is defined in `environment.model.ts`. Config is build-time only (no runtime env vars for the SPA).

## Stackpack

This project follows the `docs/ai/stackpacks/angular-s3/` standards (Jest, Playwright, GitHub Actions, Checkmarx, Datadog RUM). Refer to those docs for quality gates, review checklists, and code style rules.
