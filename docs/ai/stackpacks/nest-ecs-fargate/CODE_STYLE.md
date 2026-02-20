# Code Style Guide (NestJS Repo)

## Global Rules
- Small, scoped diffs. No drive-by refactors.
- Keep controllers thin; business logic in services.
- Validate all inbound payloads.
- Standardize errors (no stack traces to clients).
- Never log secrets/PII.

## NestJS Patterns
- Controllers: HTTP contract, validation, auth guards
- Services: business logic
- Data access: repositories/adapters
- DTOs:
  - explicit types
  - validation rules applied consistently

## Reliability Patterns
- Outbound calls:
  - explicit timeouts
  - bounded retries + jitter
- Idempotency:
  - define behavior for create/submit endpoints

## Observability (Datadog)
- Structured logs
- Correlation IDs
- Preserve trace/log correlation fields if present (do not remove)
