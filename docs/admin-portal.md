# Admin / Support Portal

**Owner team:** Warranty Digital Products
**Last updated:** 2026-02-20

---

## 1. Overview

The Admin Portal is an internal tool for customer support and security teams to investigate and assist with VIN add requests. It provides read-only visibility into contract status, request details, eligibility outcomes, and a full audit trail. The only write action available is adding internal notes to requests.

The admin portal does **not** modify business state. There is no "unlock" or "override" capability in v1. If a contract is locked (`COMMITTED_LOCKED`), it cannot be unlocked through the admin portal.

---

## 2. Access

### 2.1 URL

| Environment | URL |
|-------------|-----|
| Local dev | `http://localhost:4200/admin` |
| QA | `https://vin-portal-qa.<domain>/admin` |
| UAT | `https://vin-portal-uat.<domain>/admin` |
| Production | `https://vin-portal.<domain>/admin` |

### 2.2 Authentication

The admin portal uses a **separate authentication mechanism** from consumer sessions:

- **Production:** Integrated with internal SSO (Okta). Admins log in via their corporate credentials. The backend validates the admin JWT against `JWT_ADMIN_SECRET`.
- **Local development:** When `features.mockApi` is enabled, the mock interceptor simulates admin authentication. No real SSO integration is needed.

### 2.3 Roles

| Role | Permissions |
|------|-------------|
| **Support** | View masked contract information, request status, eligibility reason codes, and audit timeline. Add notes. |
| **Security / Admin** | All Support permissions, plus: view IP addresses, user agents, and full audit metadata. |

Role assignment is managed through the `admin_user` table (or via SSO group claims when Okta is integrated).

### 2.4 Audit

Every admin action generates an audit event:

| Action | Event Type | Details |
|--------|-----------|---------|
| View search results | `ADMIN_VIEW` | Records the search action and result count |
| View request detail | `ADMIN_VIEW` | Records which request was viewed |
| Add a note | `ADMIN_NOTE` | Records the note content |

Audit events include the admin's IP address, user agent, and correlation ID.

---

## 3. Navigating the Admin Portal

### 3.1 Dashboard (`/admin`)

The landing page provides:

- **Quick Actions:** Link to the contract search page.
- **Support Portal summary:** Description of available capabilities (view details, review audit timeline, add notes).
- **Status Reference:** Quick legend for contract status values (NOT_USED, PENDING, COMMITTED, FAILED).

### 3.2 Search Contracts (`/admin/search`)

Use the search page to find contracts. At least one search criterion is required.

#### Search fields

| Field | Description | How it works |
|-------|-------------|--------------|
| **Contract Number** | The customer's warranty contract number | The backend hashes this value (using `CONTRACT_HASH_SALT`) and searches by `contract_number_hash`. The raw contract number is never stored. |
| **External Contract ID** | The authoritative contract identifier from the verification system | Exact match against `contract_context.external_contract_id` |
| **Request ID** | The UUID of a specific VIN add request | Joins against `vin_add_request.id` to find the parent contract |

#### Search results

Results are displayed in a table with the following columns:

| Column | Description |
|--------|-------------|
| **External ID** | The external contract identifier (from the verification system) |
| **Status** | Current contract status (see Section 4) |
| **Committed VIN** | The committed VIN, masked (e.g., `WVW***4567`). Shown as `--` if no VIN has been committed. |
| **Committed At** | Timestamp when the VIN was committed. Shown as `--` if not yet committed. |
| **Actions** | "View Details" link to the contract detail page |

### 3.3 Contract Detail (`/admin/contract/:contractContextId`)

Shows detailed information for a single contract:

- **Contract Context ID** -- internal identifier for this contract's interaction with the portal.
- **Status** -- current status (see Section 4).
- **VIN Add Request** -- if a request exists, shows: request ID, VIN, decoded Year/Make/Model, eligibility result, and last updated timestamp.
- **Actions:**
  - "View Full Request Details" -- navigates to the request detail page.
  - "Refresh" -- reloads the data from the backend.

### 3.4 Request Detail (`/admin/request/:requestId`)

The most detailed view, showing everything about a specific VIN add request.

#### Request Information

| Field | Description |
|-------|-------------|
| **Request ID** | UUID of the VIN add request |
| **Status** | Current status with color-coded badge |
| **Contract Context ID** | Parent contract's internal ID |
| **VIN** | The VIN being added (full, unmasked for admin view) |
| **Vehicle Information** | Decoded Year, Make, Model (via `VinDecodeAdapter`) |

#### Eligibility

| Field | Description |
|-------|-------------|
| **Result** | "Allowed" (green) or "Not Allowed" (red) |
| **Reason Code** | Machine-readable code (e.g., `OK`, `CLASS_TOO_HIGH`, `VIN_ALREADY_USED`) |
| **Last Dependency Error** | If the request failed due to a dependency, the error message is shown here |

#### Audit Timeline

A chronological list of all events associated with this request and its parent contract. Each event shows:

- **Event type** (e.g., `AUTH_SUCCESS`, `VIN_DECODE`, `ELIGIBILITY_CHECK`, `VIN_COMMIT`, `ADMIN_VIEW`, `ADMIN_NOTE`)
- **Actor type** (e.g., `CONSUMER`, `ADMIN`, `SYSTEM`)
- **Timestamp**
- **Event data** (JSON payload with additional context, expanded inline)

The audit timeline is the primary tool for reconstructing what happened during a customer's session.

#### Add Internal Note

The sidebar contains a form to add internal notes (max 4000 characters). Notes are stored as `ADMIN_NOTE` audit events and appear in the audit timeline. Notes do not modify business state.

---

## 4. Contract Status Reference

| Status | Badge Color | Meaning | Is Terminal? |
|--------|-------------|---------|-------------|
| `NOT_USED` | Gray | Contract was authenticated, but the customer has not yet submitted a VIN commit. | No |
| `PENDING` | Yellow | A VIN commit has been accepted, but downstream dependencies have not yet confirmed. The worker will retry. | No |
| `COMMITTED_LOCKED` | Green | VIN was successfully committed. The contract is permanently locked from future VIN adds. | Yes |
| `FAILED_INELIGIBLE` | Red | Eligibility rules denied the VIN (e.g., vehicle class too high). | Yes |
| `FAILED_DEPENDENCY` | Red | The request failed because an external dependency (eligibility API, association API) was unreachable after all retries. | Yes |
| `FAILED_VALIDATION` | Red | The VIN failed format or decode validation. | Yes |
| `CANCELLED` | Gray | Manually cancelled (not used in the standard consumer flow). | Yes |

### Status transitions

```
NOT_USED --> PENDING --> COMMITTED_LOCKED
                    \--> FAILED_INELIGIBLE
                    \--> FAILED_DEPENDENCY
                    \--> FAILED_VALIDATION
                    \--> CANCELLED
```

A contract in `NOT_USED` transitions to `PENDING` when the consumer submits the commit. From `PENDING`, the system either marks it `COMMITTED_LOCKED` (success) or one of the `FAILED_*` states. Once in a terminal state, the status does not change.

---

## 5. Troubleshooting Common Scenarios

### 5.1 Customer says they submitted but status is PENDING

**What this means:** The consumer's VIN commit was accepted, but the backend could not complete the downstream dependency calls synchronously. The request is queued for the background worker to retry.

**Investigation steps:**

1. Search for the contract in the admin portal (by contract number or external ID).
2. Navigate to the request detail page.
3. Check the **Audit Timeline** for the sequence of events:
   - `VIN_COMMIT` event should be present (confirms the consumer submitted).
   - Look for `DEPENDENCY_RETRY` or `WORKER_ATTEMPT` events to see retry progress.
4. Check **Last Dependency Error** in the Eligibility section for the specific failure message.
5. Check the worker configuration:
   - Worker retries up to `WORKER_MAX_RETRIES` (default: 5) times.
   - Retry interval is `WORKER_INTERVAL_MS` (default: 30 seconds).
   - Maximum elapsed time before the request is failed: retries x interval.

**Customer communication:**

- If the request is still within the retry window, advise the customer to wait. The system will automatically complete the request when dependencies are available.
- If the request has been `PENDING` for an extended period (> 15 minutes), escalate to the engineering team. The worker may be unhealthy or the downstream dependency may be experiencing an outage.

**Add a note** documenting the customer's inquiry and your investigation findings.

### 5.2 Customer says VIN was rejected (ineligible)

**What this means:** The eligibility API determined that the VIN does not qualify for this contract. The most common reason is that the added vehicle's class exceeds the contract's primary vehicle class.

**Investigation steps:**

1. Search for the contract and navigate to the request detail page.
2. Check the **Eligibility** section:
   - **Result:** Should show "Not Allowed"
   - **Reason Code:** Explains why. Common values:
     - `CLASS_TOO_HIGH` -- the added VIN's vehicle class exceeds the primary VIN's class.
     - `VIN_ALREADY_USED` -- this VIN is already associated with another contract.
     - `CONTRACT_NOT_ELIGIBLE` -- the contract type does not allow additional VINs.
3. Check the **Audit Timeline** for the `ELIGIBILITY_CHECK` event, which may contain the raw eligibility response payload (restricted to Security/Admin role).

**Customer communication:**

- Explain that the vehicle must be the same class or lower than the primary vehicle on the contract.
- If the customer believes the rejection is in error, escalate to the business team to review the eligibility rules for the specific contract type.
- The consumer can try a different VIN, provided the contract is still in `NOT_USED` or `FAILED_INELIGIBLE` state (failed eligibility does not permanently lock the contract).

### 5.3 Customer says they did not receive confirmation email

**What this means:** After a successful VIN commit (`COMMITTED_LOCKED`), the system attempts to email a confirmation PDF via Amazon SES. The email may have failed to send or was caught by the customer's spam filter.

**Investigation steps:**

1. Search for the contract and confirm the status is `COMMITTED_LOCKED`.
2. Check the **Audit Timeline** for email-related events:
   - Look for events with `email` or `document` in the event type.
   - Check the event data for `sent: true` / `sent: false` and the SES `messageId`.
3. If `email_status` tracking is enabled on the `vin_add_request` row, check whether the value is `sent`, `failed`, or `bounced`.
4. If the email was sent successfully (SES accepted it):
   - Ask the customer to check their spam/junk folder.
   - Provide the customer with the SES message ID if they need to trace it with their email provider.
5. If the email failed:
   - Check CloudWatch logs for the SES error (filter by `service:vin-portal` and the request ID).
   - Common failures: invalid email address, SES sending limits exceeded, SES sender address not verified in the target environment.

**Resolution options:**

- The customer can download the confirmation PDF directly from the portal's result page if their session is still active.
- If the session has expired, the support team can coordinate with engineering to manually trigger a re-send via the document API endpoint:
  ```
  POST /api/v1/document/request/<requestId>/email
  { "email": "customer@example.com" }
  ```
- Add a note documenting the re-send and the customer's email address.

### 5.4 Contract shows FAILED_DEPENDENCY status

**What this means:** The backend attempted to commit the VIN, but an external dependency (eligibility API, association API) was unreachable. The worker retried up to the configured maximum and eventually marked the request as failed.

**Investigation steps:**

1. Navigate to the request detail page.
2. Check **Last Dependency Error** for the specific failure message (e.g., connection timeout, HTTP 503, circuit breaker open).
3. Check the **Audit Timeline** for `DEPENDENCY_RETRY` events. Count the retry attempts and note the timestamps.
4. Check Datadog dashboards for the relevant dependency's health during the failure window:
   - VIN Portal > API Health dashboard
   - Look for elevated 5xx rates or latency on the eligibility/association endpoints.

**Resolution options:**

- If the dependency is now healthy and this was a transient outage, the request **cannot** be automatically retried once it reaches `FAILED_DEPENDENCY` (it is a terminal state).
- The customer must start a new session and re-submit. Confirm the contract is in a state that allows a new attempt (the contract context should not be `COMMITTED_LOCKED`).
- If the dependency outage was prolonged and affected many customers, coordinate with the engineering team to identify affected requests and determine if a batch re-processing is warranted.
- Add a note documenting the outage and customer impact.

### 5.5 Contract shows FAILED_VALIDATION status

**What this means:** The VIN the customer entered failed format validation or could not be decoded by the VIN decode service.

**Investigation steps:**

1. Check the request detail for the VIN that was submitted.
2. Common causes:
   - VIN has an invalid check digit (position 9).
   - VIN contains invalid characters (I, O, Q are not valid in VINs).
   - VIN decode service could not find a matching vehicle (e.g., the VIN is too new, too old, or from an unsupported market).

**Customer communication:**

- Ask the customer to double-check the VIN on their vehicle registration or title.
- The consumer can try again with the corrected VIN.

---

## 6. API Reference (Admin Endpoints)

All admin endpoints are under `/api/v1/admin` and require admin authentication (`AdminAuthGuard`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/contracts?contractNumber=&externalContractId=&requestId=` | Search contracts. At least one query parameter required. `contractNumber` is hashed server-side. |
| `GET` | `/admin/requests/:requestId` | Get full request detail including audit timeline. |
| `POST` | `/admin/requests/:requestId/note` | Add an internal note. Body: `{ "note": "..." }` (1-4000 chars). |

All endpoints log an `ADMIN_VIEW` or `ADMIN_NOTE` audit event with the admin's IP, user agent, and correlation ID.

---

## 7. Notes and Limitations

- **No unlock capability:** Once a contract is `COMMITTED_LOCKED`, it cannot be unlocked through the admin portal. If an unlock feature is needed in the future, it will require approval workflows and additional audit controls.
- **No data modification:** The admin portal cannot change contract status, VIN data, or eligibility outcomes. The only mutation is adding notes.
- **PII masking:** VINs and contract numbers are masked in search results. The full VIN is visible only on the request detail page to authorized admin roles.
- **Restricted fields:** IP addresses and user agents in the audit timeline are only visible to Security/Admin role holders.
- **Search by VIN is not supported** in v1. To find a request by VIN, search by the contract number or external contract ID instead.

---

## Related Documentation

- [Architecture](./architecture.md) -- System architecture and sequence diagrams
- [Database Schema](./db-schema.md) -- Table definitions and status semantics
- [Security](./security.md) -- Threat model, controls, and PII policy
- [Secrets Rotation Runbook](./runbooks/secrets-rotation.md) -- Credential management for admin JWT and other secrets
- [On-Call Escalation Runbook](./runbooks/on-call-escalation.md) -- Severity levels and escalation flows
