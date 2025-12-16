# Architecture

## High-level components
1. **Angular SPA (Consumer Portal)**
   - Hosted on S3 + CloudFront (recommended)
   - Wizard-style flow to prevent errors and clearly communicate irreversible action

2. **Backend API**
   - Validates contract identity (exact match)
   - Decodes VIN
   - Checks VIN eligibility (same class or less)
   - Commits VIN add request with idempotency + locking
   - Exposes request status endpoint for polling
   - Exposes admin endpoints (protected separately)

3. **Datastore (Postgres)**
   - Contract context + one-time lock enforcement
   - Requests + retry tracking
   - Audit events (immutable)
   - Auth attempts + OTP challenge state

4. **External dependencies (placeholders in v1)**
   - Contract Verification API (authoritative for contract lookup/auth)
   - Eligibility API (authoritative for contract+VIN eligibility)
   - Association System-of-Record API (future; may not exist yet)

## Key decisions
### Contract authentication fields (v1)
- Contract Number (high entropy)
- Last Name
- ZIP Code
All exact match. OTP step-up only when suspicious signals are detected.

### One VIN ever (hard enforcement)
- Contract context transitions to `COMMITTED_LOCKED` once committed.
- Database constraints + transaction logic prevent more than one commit.

### Hybrid commit
Commit path:
1. Create request row as `PENDING` and “soft lock” the contract (transactional guard)
2. Attempt synchronous dependency calls (tight timeouts)
3. If success: mark `COMMITTED_LOCKED`
4. If ineligible: mark `FAILED_INELIGIBLE`
5. If dependencies unavailable: keep `PENDING` and complete via worker retries

## Sequence diagram
```mermaid
sequenceDiagram
  participant U as Consumer
  participant UI as Angular Portal
  participant API as Portal API
  participant CV as Contract Verify API
  participant EL as Eligibility API
  participant DB as Portal DB

  U->>UI: Enter contract # + last name + ZIP
  UI->>API: POST /contract/authenticate
  API->>CV: Verify exact match
  CV-->>API: externalContractId + contract summary
  API->>DB: Upsert contract_context; audit
  API-->>UI: sessionToken OR OTP required

  U->>UI: Enter VIN
  UI->>API: POST /vin/decode
  API-->>UI: Year/Make/Model
  UI->>API: POST /vin/eligibility
  API->>EL: Check eligibility(contract, vin)
  EL-->>API: allowed + reason
  API-->>UI: eligible result

  U->>UI: Confirm irreversible commit
  UI->>API: POST /vin/commit (idempotency key)
  API->>DB: Create request PENDING (atomic guard)
  API->>EL: Optional re-check eligibility
  alt dependencies healthy
    API->>DB: Mark COMMITTED_LOCKED
    API-->>UI: COMMITTED_LOCKED
  else dependencies down
    API-->>UI: PENDING + requestId
    Note over API,DB: Worker retries until committed or failed
  end
```

## Dependency timeouts and failover posture
- Decode and eligibility are designed to be low-latency.
- Commit uses a hybrid approach to avoid downtime when dependencies fail.
- Worker retry provides eventual consistency without forcing customer to retry repeatedly.

## Observability
- Correlation IDs end-to-end
- Structured logs with PII sanitization
- Audit events written for key lifecycle steps
- Metrics: auth failures, OTP rates, eligibility denial reasons, pending queue depth, time-to-commit
