# Integrations

This project is intentionally **isolated**. It calls external systems through adapters, but persists its own records for later downstream consumption. All adapters are injected via NestJS DI tokens defined in `backend/src/adapters/adapter.tokens.ts`. Stub implementations live in `backend/src/adapters/stubs/`; real implementations live in `backend/src/adapters/implementations/`.

## Adapter Pattern

Each external dependency implements a TypeScript interface from `backend/src/adapters/interfaces/`. The `StubsModule` (`backend/src/adapters/stubs.module.ts`) wires stub implementations for local development. Production wiring swaps stubs for real adapters via environment-specific modules.

All adapters are wrapped with a **CircuitBreaker** from `backend/src/common/utils/circuit-breaker.ts`, registered through `CircuitBreakerRegistry`. See [Circuit Breaker Settings](#circuit-breaker-settings) below.

---

## Adapters

### 1) ContractVerificationAdapter

| Property | Value |
|----------|-------|
| **Token** | `CONTRACT_VERIFICATION_ADAPTER` |
| **Interface** | `ContractVerificationAdapter` (`backend/src/adapters/interfaces/contract-verification.adapter.ts`) |
| **Purpose** | Validate contract auth fields (exact match) and return a stable contract identity |
| **Timeout** | 2 s |
| **Retry policy** | 1 retry max (safe read-only call) |
| **Circuit breaker** | Default settings (see below) |

**Interface**
```ts
interface ContractVerificationAdapter {
  verify(vin7: string, lastName: string, zip: string): Promise<ContractVerificationResult>;
}
```

**Input:** `vin7` (contract number / last 7 of VIN), `lastName`, `zip`

**Output (`ContractVerificationResult`):**
- `matched` -- whether the contract was found
- `externalContractId` -- authoritative contract identifier
- `primaryVinMasked` -- masked primary VIN for display
- `hasAdditionalVin` -- whether a VIN has already been added
- `requiresOtp` -- whether step-up verification is needed
- `maskedDestination`, `channel` -- OTP delivery info

**Failure modes:**
- No match (401)
- Dependency unavailable (503/429 depending on upstream behavior)

---

### 2) VinDecodeAdapter

| Property | Value |
|----------|-------|
| **Token** | `VIN_DECODE_ADAPTER` |
| **Interface** | `VinDecodeAdapter` (`backend/src/adapters/interfaces/vin-decode.adapter.ts`) |
| **Purpose** | Decode VIN to Year/Make/Model for UI preview |
| **Timeout** | 1.5 s |
| **Retry policy** | 0-1 retries |
| **Circuit breaker** | Default settings (see below) |

**Interface**
```ts
interface VinDecodeAdapter {
  decode(vin: string): Promise<VinDecodeResult>;
}
```

**Input:** `vin` (normalized uppercase, 17-character)

**Output (`VinDecodeResult`):** `year`, `make`, `model`

**Failure modes:**
- VIN invalid format/checksum (400)
- Decode service unavailable (503)

---

### 3) EligibilityAdapter

| Property | Value |
|----------|-------|
| **Token** | `ELIGIBILITY_ADAPTER` |
| **Interface** | `EligibilityAdapter` (`backend/src/adapters/interfaces/eligibility.adapter.ts`) |
| **Purpose** | Determine whether VIN is eligible for the contract (same class or less) |
| **Timeout** | 2 s |
| **Retry policy** | 1 retry max |
| **Circuit breaker** | Default settings (see below) |

**Interface**
```ts
interface EligibilityAdapter {
  check(externalContractId: string, vin: string): Promise<EligibilityResult>;
}
```

**Input:** `externalContractId`, `vin`

**Output (`EligibilityResult`):**
- `allowed` -- boolean
- `reasonCode` -- e.g., `OK`, `CLASS_TOO_HIGH`, `VIN_ALREADY_USED`
- `rawPayload` -- stored as JSON for support and analysis

**Failure modes:**
- Ineligible (409)
- Dependency unavailable (503)

---

### 4) AssociationAdapter (Future)

| Property | Value |
|----------|-------|
| **Token** | `ASSOCIATION_ADAPTER` |
| **Interface** | `AssociationAdapter` (`backend/src/adapters/interfaces/association.adapter.ts`) |
| **Purpose** | Persist contract-to-added-VIN association into an authoritative external system |
| **Timeout** | 2 s |
| **Retry policy** | No sync retry; deferred to worker with exponential backoff |
| **Circuit breaker** | Default settings (see below) |

**Interface**
```ts
interface AssociationAdapter {
  associate(externalContractId: string, vin: string, requestId: string): Promise<AssociationResult>;
}
```

**Input:** `externalContractId`, `vin`, `requestId`

**Output (`AssociationResult`):** `associationReferenceId`, `confirmed`

**Failure modes:**
- Dependency unavailable (503) -- keep request `PENDING` and retry via worker

---

### 5) EmailAdapter (AWS SES)

| Property | Value |
|----------|-------|
| **Token** | `EMAIL_ADAPTER` |
| **Interface** | `EmailAdapter` (`backend/src/adapters/interfaces/email.adapter.ts`) |
| **Implementation** | `SesEmailAdapter` (`backend/src/adapters/implementations/ses-email.adapter.ts`) |
| **Purpose** | Send transactional emails (confirmation PDFs) via AWS SES v2 |
| **Timeout** | Inherits AWS SDK defaults (configurable via SDK client config) |
| **Retry policy** | AWS SDK built-in retry (3 attempts with exponential backoff) |
| **Circuit breaker** | Default settings (see below) |

**Interface**
```ts
interface EmailAdapter {
  send(
    to: string,
    subject: string,
    body: string,
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>,
  ): Promise<EmailSendResult>;
}
```

**Input:** `to` (recipient email), `subject`, `body` (HTML), optional `attachments`

**Output (`EmailSendResult`):** `messageId`, `sent`

**Configuration (environment variables):**
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_SES_REGION` | No | `us-east-1` | AWS region for SES client |
| `EMAIL_FROM_ADDRESS` | Yes | -- | Verified sender address |
| `EMAIL_REPLY_TO` | No | Same as `EMAIL_FROM_ADDRESS` | Reply-to address |

**Failure modes:**
- Invalid recipient (400 from SES)
- SES service error (500/503)
- Sending quota exceeded (429)

---

### 6) Document Generation (pdf-lib)

| Property | Value |
|----------|-------|
| **Library** | `pdf-lib` |
| **Service** | `DocumentService` (`backend/src/modules/document/document.service.ts`) |
| **Purpose** | Generate confirmation PDFs for completed VIN add requests |

**Template location:** `backend/assets/templates/confirmation.pdf` (AcroForm PDF provided by design team)

**Fallback:** When the AcroForm template is not present, the service generates a basic PDF using `pdf-lib` directly with the same information layout.

**Field mapping** (`backend/src/modules/document/field-mapper.ts`):

| `DocumentData` field | AcroForm field name | Description |
|----------------------|---------------------|-------------|
| `requestReferenceId` | `referenceId` | Request UUID |
| `confirmationDate` | `confirmationDate` | Formatted date (e.g., "February 20, 2026") |
| `maskedVin` | `maskedVin` | Partially masked VIN |
| `yearMakeModel` | `vehicle` | Decoded Year Make Model string |
| `contractReference` | `contractRef` | Contract identifier |

**Process:**
1. Check for AcroForm template at `backend/assets/templates/confirmation.pdf`
2. If template exists: load it, fill named fields via `mapFields()`, flatten the form, return PDF bytes
3. If template missing: generate a fallback PDF with header, details, body text, and footer
4. Track download/email metrics via `BusinessMetricsService`

---

## Circuit Breaker Settings

All adapters share a common circuit breaker implementation (`backend/src/common/utils/circuit-breaker.ts`) with the following defaults:

| Setting | Default | Description |
|---------|---------|-------------|
| `failureThreshold` | 5 | Number of consecutive failures before the circuit opens |
| `resetTimeoutMs` | 30,000 ms (30 s) | Time to wait before transitioning from OPEN to HALF_OPEN |

**States:** `CLOSED` (normal) -> `OPEN` (failing fast with 503) -> `HALF_OPEN` (probe next call)

When the circuit is open:
- Commit path: return `PENDING` quickly and defer to worker retries
- Decode/eligibility: return 503 with a user-friendly message

Circuit breakers are managed by `CircuitBreakerRegistry` (`backend/src/common/utils/circuit-breaker-registry.ts`), which provides `getStates()` for health check visibility.

---

## Worker Retry Path

For `PENDING` requests (when synchronous dependencies are unavailable at commit time):

| Attempt | Delay |
|---------|-------|
| 1 | 1 min |
| 2 | 5 min |
| 3 | 15 min |
| 4 | 1 hour |
| 5 | 6 hours (cap) |

- Retry limit: 5 attempts (configurable)
- On final failure: mark as `FAILED_DEPENDENCY` and notify support workflows

---

## Versioning Approach

- Each adapter should be versioned internally to support contract-specific changes.
- Store upstream response version identifiers where possible in `eligibility_raw`.

## Operational Notes

- Strict timeouts and circuit-breaker behavior enforced (see `docs/operations-sla.md`).
- All external calls must pass correlation IDs via `X-Correlation-ID` header.
- PII is sanitized from logs and error messages.
- Business metrics are tracked for document downloads and email sends.
