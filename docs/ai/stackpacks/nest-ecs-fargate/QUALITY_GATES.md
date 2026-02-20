# Quality Gates (VIN Portal — Angular SPA) — must pass before merge

> Adapted from the NestJS stack pack template for this Angular frontend repo.
> CI is GitHub Actions. Security requires Checkmarx Enterprise (all features).

## Build & Quality

- Lint:
  - `npm run lint`
- Typecheck:
  - `npm run typecheck`
- Unit tests (Jest):
  - `npm run test:ci`
- E2E tests (Playwright):
  - `npm run e2e`
- Build:
  - `npm run build`

## Security (REQUIRED): Checkmarx Enterprise (all features)

CI must run Checkmarx steps per enterprise policy, including:
- SAST scan
- SCA / dependency scanning
- Any additional enabled modules

The pipeline must fail on policy violations according to security thresholds.

## Observability / Release Hygiene

- Confirm Datadog RUM config is still present (when instrumented):
  - service/env/version
  - sourcemap upload for production builds

## Bundle Budget

- Initial bundle: warning at 500kB, error at 1MB (enforced by Angular CLI)
- Any component style: warning at 4kB, error at 8kB

## Stop-the-line

- Any gate failure blocks merge.
- Any bypass requires explicit security + engineering leadership approval (documented).
