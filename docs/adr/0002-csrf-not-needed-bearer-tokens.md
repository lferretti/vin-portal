# ADR-0002: CSRF Not Needed with Bearer Tokens

## Context

Security reviewers and automated scanners may flag the absence of CSRF tokens in the VIN Portal. The application uses a stateless JWT-based authentication flow where tokens are stored in JavaScript memory and sent via the `Authorization` header.

## Decision

We will **not** implement CSRF tokens (double-submit cookie, synchronizer token, or similar patterns). The Bearer token authentication model inherently mitigates CSRF.

## Alternatives Considered

- **Double-submit cookie pattern:** Adds complexity with no security benefit when cookies are not used for authentication.
- **Synchronizer token pattern (server-side CSRF tokens):** Requires server-side session state, contradicting our stateless JWT model.
- **SameSite cookie with CSRF token:** Not applicable — we do not use cookies for authentication.

## Consequences

- **Positive:** Simpler authentication flow, no server-side CSRF state, no additional round-trips for token synchronization.
- **Positive:** Security reviewers can reference this ADR to understand the rationale.
- **Negative:** If the authentication model ever changes to use cookies (e.g., HTTP-only cookie for JWT storage), CSRF protection must be re-evaluated and implemented.
- **Constraint:** Session tokens must never be stored in cookies. If this changes, this ADR must be superseded.

## Links

- [OWASP CSRF Prevention Cheat Sheet — Token-Based Mitigation](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [docs/security.md — CSRF Protection section](../security.md)
- [ADR-0004: sessionStorage over HTTP-only Cookies](./0004-session-storage-over-cookies.md)
