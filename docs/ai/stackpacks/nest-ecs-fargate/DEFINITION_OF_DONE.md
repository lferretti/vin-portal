# Definition of Done (NestJS Repo)

## For any PR
- Requirement is captured (ticket/PRD snippet)
- Acceptance criteria is testable
- Diff is scoped (no unrelated refactors)
- QUALITY_GATES are green
- No secrets/PII added
- Datadog instrumentation preserved

## API Contract
- Any behavior change updates contract docs (OpenAPI if used) and tests.
- Breaking changes require versioning/deprecation plan.

## Testing
- Unit tests for business logic paths
- E2E tests for endpoint behavior changes (happy path + at least one failure path)

## Ops Contract (Infra handoff)
- If env vars, ports, health checks, or dependencies changed:
  - update docs/infra/APP_INFRA_CONTRACT.md
