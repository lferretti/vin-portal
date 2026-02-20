# Quality Gates (Angular Repo) — must pass before merge

> Replace script names to match your package.json.
> CI is GitHub Actions. Security requires Checkmarx Enterprise (all features).

## Build & Quality
- Lint:
  - npm run lint
- Typecheck:
  - npm run typecheck
- Unit tests (Jest):
  - npm run test -- --ci
- Build:
  - npm run build

## E2E
- Playwright smoke (PR gating):
  - npm run e2e:smoke
- Full Playwright (nightly/release):
  - npm run e2e

## Security (REQUIRED): Checkmarx Enterprise (all features)
CI must run Checkmarx steps per enterprise policy, including:
- SAST scan
- SCA / dependency scanning
- Any additional enabled modules
The pipeline must fail on policy violations according to security thresholds.

## Observability / Release Hygiene
- Confirm Datadog RUM config remains correct:
  - env (dev/uat/prod)
  - service name
  - version/release tag
- If sourcemaps are used:
  - follow org policy (often: upload to Datadog, do not publicly serve)

## Stop-the-line
- Any gate failure blocks merge.
- Any bypass requires explicit security + engineering leadership approval (documented).
