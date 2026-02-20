# Decisions

> Bulleted list of current major decisions. Promote to ADRs (in `docs/adr/`) when a decision changes an established pattern.

## Framework & Runtime

- **Angular 21** with standalone components (no NgModules). All components use `standalone: true`.
- **TypeScript ~5.9** with strict mode and strict Angular template checking enabled.
- **Tailwind CSS 4.x** for utility-first styling (custom theme with DM Sans / IBM Plex Mono fonts).
- **Jest 30** via `jest-preset-angular` for unit testing (not Karma/Jasmine).
- **Signals-based state** — `SessionService` and `ConsumerStateService` use Angular Signals for reactivity, not RxJS BehaviorSubjects.

## Architecture

- **Core / Shared / Features** module structure with path aliases (`@core/`, `@shared/`, `@features/`, `@env`).
- **Lazy-loaded feature routes** — consumer and admin features are code-split at the route level.
- **Mock API built into the app** — `MockApiService` + `mockInterceptor` provide a full offline dev experience (toggled via `environment.features.mockApi`).
- **No NgRx or external state management** — state is managed via services with Angular Signals.

## API & Data

- **API envelope pattern** — all API responses wrapped in `ApiEnvelope<T>` with `correlationId`, `success`, `data`, `error`.
- **Idempotency keys** for the irreversible VIN commit operation (`X-Idempotency-Key` header).
- **Correlation IDs** attached to every HTTP request via interceptor.
- **Backend expected at `/api/v1`** — OpenAPI spec at `openapi/vin-portal.openapi.yaml`.

## Authentication & Security

- **CAPTCHA deferred** — `captchaEnabled: false` in prod. Rate limiting + WAF provide bot mitigation at launch. Accepted risk; re-evaluate monthly.
- **Contract-based authentication** (contract number + last name + ZIP) — no SSO, no user accounts.
- **OTP step-up** triggered by risk signals (not always required).
- **Session tokens** (JWT-like) stored in `SessionService` — not persisted to localStorage.
- **One VIN ever per contract** — enforced by `COMMITTED_LOCKED` status with database constraints.

## Consumer Flow

- **Wizard pattern** with linear steps: Landing → Authenticate → [OTP] → VIN Entry → Review → Result.
- **Route guards** enforce step ordering (authGuard, otpRequiredGuard, eligibleGuard).
- **Irreversible commit** with explicit confirmation checkbox before submission.
- **Status polling** on result page (initial 10s interval, slows to 30s, max 3 min).

## Deployment

- **Angular SPA → S3 + CloudFront** (recommended deployment target).
- **No Docker/container for the frontend** — static files only.
- **Build-time environment config** via Angular file replacements (not runtime env vars).

## Testing

- **Unit tests** with Jest for validators, services, and shared components.
- **Coverage collected** from `src/app/**/*.ts`, excluding routes and config files.
- **E2E tests** — TODO: Playwright for consumer flow smoke tests.
