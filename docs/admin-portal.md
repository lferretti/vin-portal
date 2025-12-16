# Admin / Support Portal (Internal)

## Purpose
Provide customer support and security teams visibility into:
- Contract status (NOT_USED / PENDING / COMMITTED_LOCKED / FAILED)
- Request details and eligibility reason codes
- Dependency failures and retry status
- Audit trail (who/what/when/how)
- Add internal notes

## Access model (recommended)
- Separate admin auth from consumer sessions.
- Integrate with internal SSO (Okta) in production.
- Role-based access:
  - Support: view masked contract info, request status, eligibility reason codes
  - Security/Admin: view IP/user-agent, full audit metadata

## Admin pages
1. Search
   - Search by contract number (server hashes)
   - Search by external contract id
   - Search by request id
2. Contract detail
   - Status and committed VIN (masked)
   - Requests list with timestamps and statuses
3. Request detail
   - VIN + decoded Y/M/M
   - Eligibility result + reason code + raw payload (restricted)
   - Dependency errors + retry counts
   - Audit timeline
   - Notes

## Mutations (restricted)
- Notes only (does not alter business state).
- No “unlock” function in v1 (if added later, requires approvals + deep audit).

## Audit requirements
- Every admin page view emits `ADMIN_VIEW` audit event.
- Every note creation emits `ADMIN_NOTE` event.
