# App ↔ Infrastructure Contract

## Service Identification

- Service name: vin-portal
- Repo: `vin-portal`
- Owner team: Warranty Digital Products <!-- Update if team name differs -->
- Runtime: Angular S3 static site

## Environments

| Environment | S3 Bucket | CloudFront Distribution | Domain |
|-------------|-----------|------------------------|--------|
| DEV | `s3://vin-portal-dev` | <!-- Fill: CloudFront distribution ID --> | <!-- Fill: dev domain --> |
| QA | `s3://vin-portal-qa` | <!-- Fill: CloudFront distribution ID --> | <!-- Fill: qa domain --> |
| UAT | `s3://vin-portal-uat` | <!-- Fill: CloudFront distribution ID --> | <!-- Fill: uat domain --> |
| PROD | `s3://vin-portal-prod` | <!-- Fill: CloudFront distribution ID --> | <!-- Fill: prod domain --> |

> **Action required:** Fill in CloudFront distribution IDs and domain names from AWS Console. These values are stored as GitHub environment variables (`S3_BUCKET`, `CF_DISTRIBUTION_ID`) in each environment's settings.

## Configuration (Environment Variables)

Angular SPA uses **build-time** configuration via file replacements, not runtime env vars.
See `src/environments/environment.ts` and `src/environments/environment.prod.ts`.

No runtime env vars are required by the frontend.

### Build-time Configuration

- `production`: Enables Angular production mode, AOT, tree-shaking
- `apiBaseUrl`: Backend API path (default: `/api/v1`)
- `features.mockApi`: Enables in-app mock backend (dev only)
- `features.captchaEnabled`: Enables CAPTCHA on auth forms (prod only)
- `features.otpSimulation`: Simulates OTP for dev testing (dev only)

## Networking / Ports / Health

### Backend (NestJS on ECS Fargate)

- **Port:** 3000
- **Health endpoint:** `GET /api/v1/health`
  - Returns `200 OK` with `{ status: "ok", checks: { database: "ok" }, timestamp: "..." }`
  - Returns `503 Service Unavailable` with `{ status: "degraded", checks: { database: "error" }, timestamp: "..." }` when DB is unreachable
  - Exempt from rate limiting (`@SkipThrottle()`)
- **ECS health check configuration:**
  - Command: `CMD-SHELL, curl -f http://localhost:3000/api/v1/health || exit 1`
  - Interval: 30 seconds
  - Timeout: 5 seconds
  - Retries: 3
  - Start period: 60 seconds

### Angular (S3)

- Base path: `/`
- SPA routing behavior: All paths return `index.html` (CloudFront custom error page or S3 redirect rules)
- Index document: `index.html`
- Error document: `index.html` (SPA catch-all)
- Cache headers strategy:
  - `index.html`: `no-cache` (short TTL, always revalidated)
  - Hashed assets (`*.js`, `*.css`): `max-age=31536000, immutable` (production builds use content hashing)
- CloudFront behaviors:
  - Default behavior: S3 origin, HTTPS only
  - `/api/v1/*`: Proxy to backend API origin (NestJS ECS Fargate)
  - Invalidation: `/*` on each deployment (or just `/index.html`)

## Build Output

- Command: `npm run build`
- Output path: `dist/vin-portal/browser/`
- Content: Static HTML, CSS, JS (no server-side rendering)
- Size budget: Initial bundle < 500kB warning, < 1MB error

## Observability (Datadog)

### Angular RUM

- **Initialized via:** `RumService` + `APP_INITIALIZER` in `app.config.ts`
- **datadog env:** `dev` (disabled), `prod` (enabled)
- **datadog service:** `vin-portal`
- **version scheme:** git SHA (short hash, e.g., `abc1234`)
- **RUM sampling:** 100% (configurable via `environment.datadog.sampleRate`)
- **Privacy level:** `mask-user-input` (prevents PII capture: VINs, names, contract numbers)
- **Config location:** `src/environments/environment.*.ts` → `datadog` block
- **Credentials:** `clientToken` and `applicationId` must be replaced with real values in `environment.prod.ts` before deployment
- **sourcemap policy:** Upload to Datadog via `@datadog/datadog-ci` in CI, then remove `.map` files from S3 deploy

## Security (Checkmarx)

- Required scan types:
  - SAST: Yes
  - SCA: Yes (npm dependencies)
  - Other modules: As required by enterprise policy
- Policy thresholds: sast-high=0, sast-medium=5, sca-high=0 (configured in CI pipeline)
- Required branch/PR gating behavior: Block merge on policy violations

## Deployment & Rollback

- Deployment strategy: S3 sync + CloudFront invalidation (owned by infra)
- Rollback trigger definition: 5xx error rate > 5% for 5 minutes OR Datadog RUM error rate > 10% post-deploy
- Post-deploy verification:
  - `index.html` returns 200
  - App loads without console errors
  - Critical consumer flow is functional (smoke test)

## Branch Protection (GitHub)

Configure on the `main` branch:

- **Require pull request reviews:** minimum 1 approval
- **Require status checks to pass:** `quality-gates`, `backend-quality-gates`, `e2e`
- **Require Checkmarx checks:** when secrets are configured
- **Require linear history:** enforce squash or rebase merges
- **Do not allow bypassing settings:** applies to admins too

## RDS Configuration (PostgreSQL)

- **Engine:** PostgreSQL 16
- **SSL/TLS:** Required in production (`ssl: { rejectUnauthorized: true }` in TypeORM config)
  - RDS instance must have `rds.force_ssl = 1` parameter set
  - Application validates the RDS CA certificate chain
- **Connection pool:** Max 20 connections, 30s idle timeout, 5s connection timeout
- **Encryption at rest:** Enabled (AWS KMS managed key)
- **Backups:**
  - Automated daily snapshots enabled
  - Retention period: 7 days (minimum; extend to 30 days for production if compliance requires)
  - Point-in-time recovery: Enabled
- **Multi-AZ:** Recommended for production (automatic failover)
- **Maintenance window:** Set outside business hours (e.g., Sunday 03:00-04:00 UTC)
- **Credentials:** Stored in AWS Secrets Manager, injected as ECS task definition environment variables

## CORS Configuration

The backend **requires** `CORS_ALLOWED_ORIGINS` in production. The application will refuse to start if this variable is missing.

- **Format:** Comma-separated list of allowed origins
- **Example:** `CORS_ALLOWED_ORIGINS=https://portal.example.com,https://www.portal.example.com`
- **Where to set:** GitHub environment secrets for each environment (dev, qa, uat, production)
- **Verification:** After deploying, confirm `OPTIONS` preflight requests return the correct `Access-Control-Allow-Origin` header

## Dependencies (Backend)

The Angular SPA depends on a backend API at `/api/v1`. See:
- `openapi/vin-portal.openapi.yaml` for the full API contract
- `docs/architecture.md` for the backend architecture
- The backend's own `APP_INFRA_CONTRACT.md` for its infra requirements
