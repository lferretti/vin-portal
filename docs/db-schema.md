# Database Schema (Postgres)

## Goals
- Enforce **one additional VIN ever** per contract.
- Support hybrid commit and retry workflow.
- Provide an immutable audit trail for security/compliance.
- Minimize stored PII; store hashes/masks only.

## Core tables
- `contract_context`: one row per contract encountered; holds lock and committed VIN metadata.
- `vin_add_request`: one row per attempt to add a VIN; state machine and retry metadata.
- `otp_challenge`: OTP step-up workflow state (only when suspicious triggers occur).
- `auth_attempt`: authentication telemetry for abuse detection and lockout logic.
- `audit_event`: immutable event log (who/what/when/how).
- `admin_user`: optional placeholder until internal SSO is integrated.

## Status semantics
- `NOT_USED`: contract authenticated, no commit started.
- `PENDING`: commit accepted; waiting on dependencies/worker completion.
- `COMMITTED_LOCKED`: committed successfully; contract is locked from future VIN adds.
- `FAILED_INELIGIBLE`: eligibility rules denied VIN.
- `FAILED_DEPENDENCY`: dependency unreachable after retries/circuit logic.
- `FAILED_VALIDATION`: VIN format/decode validation failed.
- `CANCELLED`: optional/manual cancellation state (not typical for consumer flow).

## PII policy
- **Do not store** raw contract auth fields (last name, ZIP).
- Hash contract number (salted) to correlate attempts without exposing raw values.
- IP address treated as sensitive operational data; restrict access and consider encryption-at-rest controls.

## DDL
The canonical SQL DDL is embedded below and should be applied via migrations (Flyway/Liquibase/etc.).

```sql
-- See: openapi and docs for expected behaviors.
-- (DDL provided in earlier spec; keep as single source of truth in migrations)
-- If you want, I can also emit Flyway versioned migration files.
```
