# Operations & SLA

## Availability target
- Target availability: **99% uptime**
- Portal should remain usable even when some dependencies are degraded (hybrid commit).

## Latency targets (recommended)
- Authenticate: p95 < 1.5s (dependency-dependent)
- VIN decode: p95 < 1.0s
- Eligibility check: p95 < 1.5s
- Commit: p95 < 2.0s for immediate commit; otherwise return PENDING quickly (< 1.0s) and complete asynchronously

## Timeouts and retries (recommended defaults)
### Synchronous path (request/response)
- Contract verification timeout: 2s (1 retry max if safe)
- VIN decode timeout: 1.5s (no retry or 1 retry)
- Eligibility timeout: 2s (1 retry max)
- Association (future) timeout: 2s (no retry sync; defer to worker)

### Worker retry path
- Exponential backoff schedule:
  - 1 min, 5 min, 15 min, 1 hour, 6 hours (cap)
- Retry limit: 5 attempts (configurable)
- On final failure: `FAILED_DEPENDENCY` and notify support workflows

## Circuit breaker (recommended)
- Trip circuit when:
  - dependency 5xx rate > threshold
  - repeated timeouts exceed threshold
- When circuit open:
  - return PENDING quickly (for commit)
  - return 503 for decode/eligibility (with user-friendly message)

## Monitoring and alerting
Metrics:
- auth success rate, auth failure rate (by reason)
- OTP required rate and OTP success rate
- eligibility pass rate and top denial reason codes
- pending request count and age (time in PENDING)
- commit success rate
- dependency latency and error rates

Alerts:
- sudden spikes in auth failures (possible attack)
- OTP required rate spike
- PENDING backlog > threshold or oldest pending > threshold
- dependency 5xx/timeouts sustained

## Incident playbooks (starter)
- Dependency down: portal continues with PENDING commits; support notified; investigate upstream
- Abuse spike: enable CAPTCHA always; tighten WAF rules; increase lockout
- Data leak concern: disable verbose logs, rotate secrets, audit access logs, notify security
