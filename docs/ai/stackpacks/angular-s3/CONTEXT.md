# Repo Context: Angular + S3 Hosting

## System Goals
- Maintain a consistent Angular UI with predictable patterns and test coverage.
- Ensure changes are safe via Jest + Playwright and CI gates.
- Ensure Checkmarx + Datadog RUM requirements are preserved.

## Architecture Snapshot
- Frontend: Angular SPA
- Hosting: AWS S3 web hosting bucket (optionally CloudFront)
- CI/CD: GitHub Actions
- Security: Checkmarx Enterprise scans required
- Observability: Datadog Browser RUM enabled

## Key Invariants (Do not violate)
- No secrets or PII in code, logs, or client-side telemetry.
- Datadog RUM must remain enabled and properly configured for environment separation.
- Error handling patterns and user-facing messaging remain consistent.
- No breaking route changes without redirect strategy (if applicable).

## RUM Guidance (high-level)
- RUM initialization exists and must remain intact.
- Route changes should emit meaningful view names.
- Add user context ONLY if approved and non-PII (e.g., internal userId hash, role, tenantId).
- Do not emit sensitive inputs (VINs, emails, etc.) into RUM events.

## Infra Department Interface (app-side)
This repo must provide:
- Required env vars at build time (API base URL, auth config, datadog env/service/version)
- Artifact output path and index error routing requirements (SPA)
- Caching/sourcemap strategy requirements (if CloudFront is used)
See docs/infra/APP_INFRA_CONTRACT.md
