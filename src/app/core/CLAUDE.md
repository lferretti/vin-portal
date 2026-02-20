# Core Module

Singleton services, guards, interceptors, and models used app-wide. Everything here is provided at root level.

## Services (`services/`)

- **Pattern:** `@Injectable({ providedIn: 'root' })`, state via signals, barrel-exported from `index.ts`
- **ApiService** — Base HTTP wrapper (all services use this, not `HttpClient` directly)
- **SessionService** — JWT session in `sessionStorage`, expiry tracking, redirect URL management
- **ContractService** — Contract authentication API
- **OtpService** — OTP verification API
- **VinService** — VIN decode, eligibility check, commit, status polling
- **IdempotencyService** — Generates and caches idempotency keys for VIN commit
- **AdminService** — Admin dashboard API
- **RumService** — Datadog RUM initialization (reads from environment config, disabled in dev)

When adding a new service: create the file, add `@Injectable({ providedIn: 'root' })`, export from `services/index.ts`.

## Guards (`guards/`)

- **Pattern:** Functional `CanActivateFn` (not class-based), use `inject()` inside the function
- **authGuard** — Checks `SessionService.isAuthenticated`, redirects to `/authenticate`
- **eligibleGuard** — Checks consumer state has eligible VIN before `/review`
- **otpRequiredGuard** — Checks OTP state before `/verify-otp`

## Interceptors (`interceptors/`)

Registered in `app.config.ts` via `withInterceptors()`. Order matters:

1. **mockInterceptor** — Intercepts API calls when `features.mockApi` is enabled (dev only)
2. **correlationInterceptor** — Adds `X-Correlation-ID` header to every request
3. **authInterceptor** — Adds `Authorization: Bearer <token>` from SessionService
4. **errorInterceptor** — Transforms HTTP errors into structured `ApiError` format

## Models (`models/`)

- **Interfaces only** (no classes) — `ApiEnvelope<T>`, `ApiError`, domain models
- **Enums** — `VinAddStatus` (PENDING, COMMITTED_LOCKED, FAILED_*)
- **Barrel export** from `models/index.ts`
- Helper: `isTerminalStatus()` for polling logic
