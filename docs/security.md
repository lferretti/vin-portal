# Security & Compliance

## Summary
This is a **public portal** that changes contractual associations. Primary risks are unauthorized access, brute force attempts, and data leakage. Controls focus on:
- limiting abuse (rate limits, WAF, OTP step-up)
- preventing double-commit or tampering (idempotency + DB constraints)
- minimizing PII exposure (hash/mask; sanitized logs)
- preserving audit evidence (immutable audit events)

## Threat model (top risks)
1. **Brute force authentication attempts**
2. **Contract enumeration / guessing**
3. **Bot automation / scraping**
4. **Unauthorized VIN changes** (business integrity)
5. **Race conditions** (double-submit leading to multiple VINs)
6. **PII leakage through logs or analytics**
7. **Dependency failures** causing user confusion or support burden

## Controls (recommended baseline)
### WAF + rate limiting
- WAF in front of API and optionally CloudFront
- Rate limit by:
  - IP (e.g., 20/minute)
  - contract hash (e.g., 5 attempts/10 minutes)
  - OTP verify attempts (e.g., 5 attempts then lockout)

### OTP step-up (suspicious cases only)
Triggers include:
- repeated failed auth attempts on same contract
- many contract attempts from same IP
- high-risk ASN/proxy/Tor signals
- geo mismatch (if geo-restrictions enabled)

OTP best practices:
- 6 digits
- TTL 5–10 minutes
- lockout with cooldown window
- store only hashed OTP (salted); never plaintext

### Optional CAPTCHA (feature-flag)
- Default: conditional (only when suspicious triggers fire)
- Escalate: always require CAPTCHA on authenticate if abuse increases

### Session token security
- Short TTL (e.g., 15 minutes)
- Scoped claims:
  - contractContextId
  - externalContractId (optional)
  - issuedAt, expiresAt
  - risk tier (optional)
- Token cannot be used to access other contract contexts

### Idempotency + locking
- Require `X-Idempotency-Key` on `/vin/commit`
- DB uniqueness and transactional guards enforce one commit ever

## Logging & audit policy
### Allowed (structured logs)
- correlationId
- status codes and reason codes
- timing and dependency health
- masked contract identifiers
- requestId

### Restricted
- IP address (store, but access controlled)
- user agent (store, but access controlled)

### Forbidden (do not store)
- raw contract number
- raw last name
- raw ZIP
- OTP code plaintext

## Data retention
Current assumption: retain indefinitely, but:
- define access controls and “need to know”
- consider retention tiers:
  - audit_event: long retention
  - auth_attempt: shorter retention (e.g., 30–90 days) unless security requires more

## Privacy considerations
- Customer data minimization
- Masking for support UI
- Encryption at rest (DB), TLS in transit
- Avoid third-party analytics that capture PII from inputs
