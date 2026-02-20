# Production Readiness Plan

## Context

Comprehensive audit of the VIN Portal (Angular 21 SPA + NestJS backend) identified the work remaining to launch as an enterprise, production-ready platform. The codebase has strong foundations — solid architecture, 92% test coverage, detailed documentation, and a full CI/CD pipeline. The gaps are primarily operational: dependency patches, stub replacements, monitoring activation, and accessibility polish.

AWS infrastructure (S3, CloudFront, ECS, RDS, IAM) is provisioned and managed by the infrastructure team — this plan covers application-level work only.

## Decisions

### Email Service: AWS SES

- Native to existing AWS stack; infra team provisions SES identity, domain verification, and sandbox escape
- Backend sends via `@aws-sdk/client-sesv2` using IAM role credentials (no API keys to manage)
- Async delivery via worker queue for resilience — email failures don't block the user flow
- Bounce/complaint handling deferred to v2 (SES publishes to SNS; we can subscribe later)
- Infra team owns sending domain and DNS (DKIM, SPF, DMARC)

### Document Generation: pdf-lib with AcroForm Templates

- Use `pdf-lib` to load a pre-built PDF template with AcroForm fillable fields
- Design/business team provides the branded template with named form fields (created in Adobe Acrobat or equivalent)
- Backend loads template, fills named fields with contract/customer values, flattens the form (read-only output), and returns the final PDF
- Replace current PDFKit stub in `backend/src/modules/document/document.service.ts`
- Template stored in `backend/assets/templates/` and bundled in the Docker image
- **Field list is TBD** — template and field mapping will be finalized as the document design is completed; the implementation is structured so adding fields requires only a template update and a one-line mapping addition

**Blocked on:**
- AcroForm PDF template from design/business team
- Final list of dynamic field names and their data sources

---

## Phase 1 — Security & Critical Fixes

*Target: Sprint 1 (1–2 weeks)*

These items are blocking and should be resolved before any environment receives real traffic.

### 1.1 Patch Dependency Vulnerabilities

- Run `npm audit fix` for both frontend and backend
- Upgrade Angular to 21.0.7+ to resolve XSS via unsanitized SVG script attributes (GHSA-jrmj-c5cx-3cw6)
- Upgrade `ajv` to >=8.18.0 (ReDoS with `$data` option)
- Verify `@modelcontextprotocol/sdk` is dev-only and not in production bundle
- Run `npm audit --omit=dev` and confirm zero high/critical vulnerabilities

### 1.2 Remove Console Logging in Production Paths

- `src/app/core/interceptors/error.interceptor.ts` — remove `console.warn` / `console.error` calls that may contain PII from API error messages
- `src/app/core/services/global-error-handler.ts` — remove `console.error('Unhandled error:', error)` in production; errors already routed to Datadog RUM
- `src/app/core/services/mock-api.service.ts` — remove `console.log` that exposes email addresses (line 545)
- Add ESLint rule `no-console` with override for test files only

### 1.3 Rate Limit Cooldown UI

- Parse `Retry-After` header in `error.interceptor.ts` when receiving 429 responses
- Pass retry-after value to consuming components
- Add countdown timer UI in `authenticate.component.ts` and `verify-otp.component.ts`
- Disable form submission until countdown expires

### 1.4 Request Infra Team: CloudFront Security Headers

Provide infra team the configuration from `docs/infra/cloudfront-headers.md`:
- Strict-Transport-Security (2 years, includeSubDomains, preload)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

Attach Response Headers Policy to all CloudFront distributions (dev, qa, uat, prod).

### 1.5 Request Infra Team: CORS Verification

- Confirm `CORS_ALLOWED_ORIGINS` environment variable is set for each environment
- Backend refuses to start without it in production — verify this is working

---

## Phase 2 — External Adapter Integration

*Target: Sprints 2–4 (4–6 weeks)*

Replace all stub adapters with real implementations. Each adapter follows the existing pattern in `backend/src/adapters/`.

### 2.1 ContractVerificationAdapter

- Replace stub in `backend/src/adapters/stubs/` with real implementation
- Wire circuit breaker (class exists in `backend/src/common/utils/circuit-breaker.ts` but is not integrated)
- Add timeout config per `docs/operations-sla.md` (2s, 1 retry)
- Pass `x-correlation-id` to upstream
- Add environment variables to `.env.example` and `docs/infra/github-environments.md`

### 2.2 VinDecodeAdapter

- Replace stub with real VIN decode service integration
- Timeout: 1.5s, 0–1 retries per SLA
- Wire circuit breaker

### 2.3 EligibilityAdapter

- Replace stub with real eligibility service integration
- Timeout: 2s, 1 retry per SLA
- Wire circuit breaker

### 2.4 AssociationAdapter

- Replace stub with real association service
- Used by `CommitWorkerService` for async VIN commit persistence
- Timeout: 2s, no sync retry (deferred to worker retry path)
- Wire circuit breaker

### 2.5 Circuit Breaker Wiring

- Integrate `CircuitBreaker` class into all 4 adapters
- Expose circuit breaker state in health endpoint (`GET /api/v1/health`)
- Add Datadog metrics on state transitions (CLOSED → OPEN → HALF_OPEN)
- Configure thresholds per `docs/operations-sla.md`

### 2.6 OTP Provider Integration

- Replace hardcoded `"123456"` OTP code with real provider (SMS/email gateway)
- Integrate with chosen email service (Phase 3) or separate SMS provider
- Maintain hash+salt storage pattern already in place

### 2.7 Update `docs/integrations.md`

- Document real adapter endpoints, auth methods, timeout configs
- Add email and document adapters to the integration inventory

---

## Phase 3 — Email & Document Service

*Target: Sprints 3–5*

*Blocked on: AcroForm PDF template from design/business team and final field list.*

### 3.1 Email Adapter (AWS SES)

- Create `EmailAdapter` interface following existing adapter pattern:
  - `send(to: string, subject: string, body: string, attachments?: Buffer[]): Promise<{ messageId: string; sent: boolean }>`
- Add `EMAIL_ADAPTER` token to `backend/src/adapters/adapter.tokens.ts`
- Create stub implementation in `backend/src/adapters/stubs/` (logs to console, returns success)
- Create SES implementation using `@aws-sdk/client-sesv2`:
  - Uses IAM role credentials (no API keys — ECS task role assumed)
  - Sends raw MIME message with PDF attachment
  - Returns SES message ID for tracking
- Add environment variables to `.env.example` and `docs/infra/github-environments.md`:
  - `EMAIL_FROM_ADDRESS` — verified sender (e.g., `noreply@portal.example.com`)
  - `EMAIL_REPLY_TO` — support address
  - `AWS_SES_REGION` — SES region (may differ from app region)
- Wire circuit breaker + correlation ID passthrough
- Async delivery: email send runs via existing worker queue — user gets immediate success response, worker handles actual SES call with retry on transient failure

### 3.2 Request Infra Team: SES Provisioning

- Verify sending domain (DKIM, SPF, DMARC records)
- Move SES out of sandbox for production (requires AWS support request)
- Add SES send permissions to ECS task IAM role (`ses:SendRawEmail`)
- Provide verified `EMAIL_FROM_ADDRESS` per environment

### 3.3 Document Generation (pdf-lib + AcroForm)

- Install `pdf-lib` in backend (`npm install pdf-lib`)
- Remove `pdfkit` dependency from backend
- Create `backend/assets/templates/` directory for PDF templates
- Update `backend/Dockerfile` to include `assets/` in the build
- Replace `DocumentService.generatePdf()` implementation:
  1. Load AcroForm template from `assets/templates/confirmation.pdf`
  2. Get form fields via `pdfDoc.getForm()`
  3. Fill named fields with contract/customer values from the `vin_add_request` + `contract_context` entities
  4. Flatten form (make read-only): `form.flatten()`
  5. Return `pdfDoc.save()` as Buffer
- Create `FieldMapper` utility that maps entity data to form field names — single source of truth for the mapping, easy to extend when new fields are added
- **Known fields** (pending final list): request reference ID, confirmation date, masked VIN, year/make/model, contract reference
- Add document generation event to audit trail

### 3.4 Wire Email to Document Service

- Update `backend/src/modules/document/document.service.ts`:
  - `emailDocument()` generates PDF via `generatePdf()`, then calls `EmailAdapter.send()` with PDF as attachment
  - Email subject/body templates stored as constants (or simple Handlebars templates if needed)
- Add `email_status` field to `vin_add_request` entity (nullable: `sent`, `failed`, `bounced`)
- Create database migration for the new column
- On SES send success: update `email_status = 'sent'`, log audit event
- On SES send failure: update `email_status = 'failed'`, log audit event, schedule retry via worker

### 3.5 Add Document Endpoints to OpenAPI Spec

- Document `GET /document/request/{requestId}/pdf` and `POST /document/request/{requestId}/email` in `openapi/vin-portal.openapi.yaml`
- Include request/response schemas, error codes, auth requirements

### 3.6 E2E Tests for Document Flow

- Test PDF download triggers browser download (verify response headers and content type)
- Test email submission with valid/invalid addresses
- Test error states (service unavailable, invalid request ID)
- Backend E2E: verify `DocumentService.generatePdf()` produces valid PDF with expected field values filled

---

## Phase 4 — Observability & Monitoring

*Target: Sprint 4–5 (2–3 weeks)*

### 4.1 Request Infra Team: Datadog Monitors

Provide monitor definitions from `docs/infra/datadog-monitors.md` to infra team for creation:

**P1 (PagerDuty):**
- Frontend error rate > 1% for 5 min
- Backend 5xx rate > 5% for 5 min

**P2 (Slack):**
- API p95 latency > 2s for 10 min
- Pending request backlog > 50 for 15 min
- Worker final failure (any occurrence)
- DB connection pool > 90% for 5 min

**Additional monitors to define:**
- Auth failure spike (> 5x baseline in 5 min)
- OTP required rate spike
- Oldest pending request age > 1 hour
- Commit success rate degradation
- Circuit breaker state changes

### 4.2 Business Event Logging

Add structured Datadog custom metrics/events for:
- `auth.attempt` — result (success, no_match, otp_required, rate_limited, locked), contract hash
- `otp.verify` — result (success, invalid, expired, locked_out), attempt count
- `eligibility.check` — result (allowed, denied), reason code
- `vin.commit` — path (sync, async), result (committed, pending, failed)
- `worker.retry` — attempt number, backoff state, final status
- `document.download` — request ID
- `document.email` — result (sent, failed)

### 4.3 Frontend Custom RUM Actions

- Add `RumService.addAction()` calls for key user interactions:
  - Form submissions (authenticate, OTP verify, VIN commit)
  - Document download/email
  - Session expiry warning shown/dismissed
- Track user flow completion rate (landing → result)

### 4.4 Request Infra Team: Datadog Dashboard

Provide dashboard definition for "VIN Portal Overview":
- Auth success/failure rates
- Pending request count and age
- Dependency latency heatmap
- Error rate by type
- Core Web Vitals (LCP, FID, CLS)

### 4.5 Post-Deploy Smoke Tests

- Add CI job that runs `npm run e2e:smoke` against the deployed URL after each environment deploy
- Requires test credentials to be available per environment
- Fail deploy pipeline if smoke tests fail

### 4.6 Integrate Load Tests into CI

- Run k6 `smoke` profile after staging deploy (lightweight, 1 VU)
- Run full load test on manual trigger or nightly schedule against staging
- Alert on SLA threshold regression vs. baseline

---

## Phase 5 — Accessibility & UX Polish

*Target: Sprint 5–6 (1–2 weeks)*

### 5.1 Form Accessibility

- Add `[attr.aria-invalid]="control?.invalid && control?.touched"` to form inputs in `form-field.component.ts`
- Ensure all error messages are linked via `aria-describedby`

### 5.2 Session Expiry Dialog

- Add `aria-modal="true"` to `session-expiry-warning.component.ts`
- Implement focus trap (focus stays within dialog while open)
- Add Escape key handler to dismiss or extend session

### 5.3 Admin Table Semantics

- Add `scope="col"` to `<th>` elements in `contract-search.component.ts`
- Wrap admin sidebar in `<nav aria-label="Admin navigation">`

### 5.4 SEO Basics

- Add `<meta name="description">` to `src/index.html`
- Add `robots.txt` (allow landing page, disallow authenticated routes)
- Verify Angular route titles are applied via `TitleStrategy`

---

## Phase 6 — Operational Hardening

*Target: Sprint 6–7 (2 weeks)*

### 6.1 Deployment Rollback Automation

- Add post-deploy health check step in `ci.yml` after CloudFront invalidation
- If health check fails, trigger rollback (redeploy previous S3 artifact + ECS task revision)
- Define rollback criteria: 5xx > 5% for 5 min or RUM error rate > 10%

### 6.2 Database Migration Rollback Runbook

- Create `docs/runbooks/database-migration-rollback.md` (referenced but missing)
- Document rollback procedure for each migration
- Add migration dry-run step in CI before apply

### 6.3 Secrets Rotation — Complete Runbook

- Add Datadog credential rotation to `docs/runbooks/secrets-rotation.md`
- Add email service credential rotation procedure
- Add document service credential rotation if applicable

### 6.4 Sourcemap Upload Automation

- Add `@datadog/datadog-ci sourcemaps upload` step after frontend build in CI
- Remove `.map` files from S3 deploy (security — prevents reverse engineering)
- Verify Datadog can resolve stack traces from uploaded sourcemaps

### 6.5 Admin Portal Documentation

- Complete `docs/admin-portal.md` with:
  - How to search contracts and interpret statuses
  - How to view request details and audit trail
  - How to add notes to requests
  - Troubleshooting common support scenarios

---

## Deferred / Not In Scope

| Item | Reason |
|------|--------|
| Infrastructure-as-Code (Terraform) | Managed by infra team |
| Runtime feature flags | Not needed for v1; revisit if gradual rollout required |
| Internationalization (i18n) | English-only for launch; add when multi-language required |
| Service worker / offline support | Low priority for authenticated portal with linear flows |
| Multi-region DR | Infra team responsibility; document requirements in infra contract |
| Admin bulk actions / export | Post-launch feature based on support team feedback |
| Visual regression testing | Nice-to-have; add after core E2E suite is stable |

---

## Summary

| Phase | Focus | Sprints | Depends On |
|-------|-------|---------|------------|
| **1** | Security & critical fixes | 1 | Nothing |
| **2** | External adapter integration | 2–4 | Vendor API access |
| **3** | Email (SES) & document (pdf-lib) | 3–5 | AcroForm template from design team, infra team SES provisioning |
| **4** | Observability & monitoring | 4–5 | Infra team (Datadog, PagerDuty, Slack) |
| **5** | Accessibility & UX polish | 5–6 | Nothing |
| **6** | Operational hardening | 6–7 | Phases 1–4 complete |

Phases 1, 5, and parts of 4 can proceed immediately. Phase 2 is blocked on vendor API access. Phase 3 is blocked on the AcroForm PDF template and infra team SES provisioning.
