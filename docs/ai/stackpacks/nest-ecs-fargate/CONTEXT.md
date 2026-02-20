# Repo Context: VIN Portal (Angular SPA)

> **Note:** This repo is an **Angular 21 frontend**, not a NestJS backend.
> The stack pack templates are NestJS-oriented; adapt guidance to Angular context.
> A future backend repo will use the NestJS stack pack directly.

## System Goals

- Provide a consumer-facing wizard for adding a VIN to a warranty contract.
- Provide an admin portal for support staff to search and manage requests.
- Prevent regressions via automated tests + CI gates.
- Maintain security posture enforced by Checkmarx enterprise requirements.

## Architecture Snapshot

- Frontend: Angular 21 SPA (standalone components, signals-based state)
- Hosting: S3 + CloudFront (static site)
- Backend dependency: REST API at `/api/v1` (separate repo, NestJS on ECS Fargate)
- CI/CD: GitHub Actions
- Security: Checkmarx Enterprise scans required
- Observability: Datadog RUM (TODO: instrument)

## Key Invariants

- No secrets/PII in logs, error messages, or client-side storage.
- API envelope pattern with typed error codes (`ApiEnvelope<T>`).
- Correlation IDs on every HTTP request.
- Session tokens are memory-only (not persisted to localStorage/cookies).
- One VIN per contract — enforced in both UI (guards) and backend (database locks).
- Irreversible commit requires explicit confirmation checkbox + idempotency key.

## What This Repo Contains

- Consumer portal (6 pages): landing → authenticate → OTP → VIN entry → review → result
- Admin portal (4 pages): dashboard, contract search, contract detail, request detail
- Mock API service for offline development
- OpenAPI spec for the backend contract
- Unit tests (Jest) for validators, services, shared components

## What This Repo Does NOT Contain

- Backend API implementation (separate repo)
- Database / migrations
- Docker / container configuration
- Infrastructure-as-code (CDK, Terraform)
