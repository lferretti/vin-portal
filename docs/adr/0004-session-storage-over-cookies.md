# ADR-0004: In-Memory Token Storage Over Cookies or Web Storage

## Context

The VIN Portal authenticates consumers by verifying their contract details (contract number, last name, ZIP code) and optionally a one-time password. Upon successful authentication, the backend issues a JWT that must be attached to subsequent API requests. The team needed to decide where to store this token on the client side.

The application serves short-lived sessions: a consumer authenticates, adds a vehicle to their contract, and leaves. Sessions are not expected to survive page refreshes or span multiple tabs. The threat model prioritizes protection against cross-site scripting (XSS) and cross-site request forgery (CSRF), both of which are influenced by token storage location.

## Decision

Store the JWT exclusively in JavaScript memory as an Angular signal within the `SessionService`. The token is held in a `signal<string | null>()` and is attached to outgoing requests by the `authInterceptor`. The token exists only for the lifetime of the current page context and is cleared on page refresh, tab close, or navigation away from the application.

No cookies, `localStorage`, or `sessionStorage` are used for token persistence.

## Alternatives Considered

- **HTTP-only cookies:** The most commonly recommended approach for JWT storage because JavaScript cannot read HTTP-only cookies, mitigating XSS token theft. However, cookies are automatically sent with every request to the cookie's domain, which introduces CSRF vulnerability. Mitigating CSRF requires server-side CSRF tokens (synchronizer pattern or double-submit), adding complexity to both the backend and frontend. Since the VIN Portal is a stateless SPA hosted on S3/CloudFront talking to an API on a different origin, cookie-based auth also introduces cross-origin cookie complications (SameSite attributes, CORS credential handling).

- **localStorage:** Persists across page refreshes and browser restarts. This persistence is unnecessary and undesirable for the VIN Portal's short session model. localStorage is accessible to any JavaScript running on the page, making it vulnerable to XSS attacks. A successful XSS attack could exfiltrate tokens that persist indefinitely until explicitly cleared.

- **sessionStorage:** Scoped to a single tab and cleared when the tab closes, which is closer to the desired behavior. However, sessionStorage survives page refreshes within the same tab, which is more persistence than needed. Like localStorage, it is accessible to JavaScript and vulnerable to XSS. It also does not share state across tabs, which is acceptable but provides no advantage over in-memory storage.

## Consequences

**Positive:**
- Tokens are inherently cleared on page refresh, enforcing the short-session design. There is no stale token risk.
- No CSRF vulnerability: since the token is not in a cookie, the browser never automatically attaches it to requests. The `authInterceptor` explicitly adds the `Authorization` header only to intended API calls. This eliminates the need for CSRF tokens entirely (see ADR-0002).
- Simple implementation: a single signal in a service, no cookie parsing, no storage event listeners, no expiry management.
- Reduced attack surface: even if an XSS vulnerability exists, the token is only accessible in the current execution context and cannot be extracted from persistent storage after the page is closed.

**Negative:**
- Any full page refresh (F5, browser navigation) clears the session, requiring re-authentication. This is intentional for the consumer flow (short, linear sessions) but could be inconvenient for admin users performing longer workflows. Admin sessions may need to be revisited if persistence becomes a requirement.
- The token cannot be shared across tabs. Opening the portal in a new tab requires a fresh authentication. This is acceptable for the consumer flow but is a known limitation.
- If the application ever needs to support "remember me" or long-lived sessions, this approach would need to be replaced or augmented with a persistent storage mechanism.
- Server-side token revocation is still necessary for logout and session expiry; in-memory storage only controls the client-side lifecycle.

## Links

- [OWASP Token Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html#token-storage-on-client-side)
- [ADR-0002](./0002-csrf-tokens-not-needed.md) — CSRF tokens not needed (consequence of this decision)
- [ADR-0003: Signals Over NgRx](./0003-signals-over-ngrx.md) — Token stored as a signal
- `src/app/core/services/session.service.ts` — In-memory token storage
- `src/app/core/interceptors/auth.interceptor.ts` — Attaches token to API requests
