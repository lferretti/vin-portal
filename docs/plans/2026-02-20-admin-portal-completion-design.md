# Admin Portal Completion Design

**Date:** 2026-02-20
**Status:** Approved
**Spec:** `docs/admin-portal.md`

---

## Problem

An audit of the admin portal implementation against `docs/admin-portal.md` found 18 gaps: 5 critical, 3 high, 4 medium, 6 low. The portal is structurally scaffolded but non-functional for real use. Key issues: no admin authentication, a stubbed contract detail page, no role-based access, and missing backend endpoints.

## Decisions

- **Auth stub:** Auto-login with role picker in dev mode. Okta Sign-In Widget placeholder for prod.
- **Scope:** All 18 gaps addressed in one round.
- **Roles:** Map spec roles to JWT values: Support -> `support`, Security/Admin -> `admin`.

---

## 1. Admin Authentication

### Frontend

- `AdminSessionService` (`core/services/admin-session.service.ts`): manages admin JWT, role signal, identity. Separate from consumer `SessionService`. Stores token in `sessionStorage` under `admin_token`.
- `adminAuthGuard` (`core/guards/admin-auth.guard.ts`): functional guard checking `AdminSessionService.isAuthenticated()`, redirects to `/admin/login`.
- Replace consumer `authGuard` on admin routes with `adminAuthGuard`.
- `AdminLoginComponent` at `/admin/login`: In dev/mock mode, shows role picker (Support / Security-Admin) that calls `POST /admin/auth/dev-login` and stores the returned JWT. Contains a container `<div id="okta-signin-widget">` and env config fields (`oktaIssuer`, `oktaClientId`) for future Okta widget integration.

### Backend

- `POST /api/v1/admin/auth/dev-login`: Only available when `NODE_ENV !== 'production'`. Accepts `{ role: 'admin' | 'support' }`, returns signed admin JWT via existing `AuthService.createAdminToken()`.
- `POST /api/v1/admin/auth/sso-callback`: Stubbed, returns 501 Not Implemented. Placeholder for Okta OIDC callback.

### Mock Interceptor

- Handle `POST /admin/auth/dev-login`: return mock admin JWT with selected role.

## 2. Contract Detail Page + Endpoint

### Backend

- `GET /api/v1/admin/contracts/:contractContextId` on `AdminController`.
- `AdminService.getContractDetail(contractContextId, auditContext)`: fetch `ContractContext` by ID, join latest `VinAddRequest`, emit `ADMIN_VIEW` audit event.

### Frontend

- New `AdminService.getContractDetail(contractContextId)` method.
- Wire `ContractDetailComponent.loadData()` to the real API call.

### Mock

- Handle `GET /admin/contracts/:id` returning mock contract data.

## 3. Role-Based Access

### Backend

- `@Roles()` decorator + `RolesGuard` reading role from JWT payload.
- `AdminService.getRequestDetail()`: strip `sourceIp`/`userAgent` from audit events when caller role is `support`.
- Wire `AdminUser` entity into `AdminModule` for future SSO subject validation.

### Frontend

- `AdminSessionService.role()` signal.
- Audit timeline: conditionally show IP/user-agent only for `admin` role.
- Layout header: show admin name + role badge.
- Logout button: clear admin session, redirect to `/admin/login`.

## 4. Search Validation & Mock Fixes

### Backend

- Custom validator on `AdminSearchQueryDto`: return 400 if all params empty.

### Mock

- Fix `searchContracts` to filter by `requestId`.

## 5. Dashboard & UI

- Update status reference to all 7 spec statuses: `NOT_USED`, `PENDING`, `COMMITTED_LOCKED`, `FAILED_INELIGIBLE`, `FAILED_DEPENDENCY`, `FAILED_VALIDATION`, `CANCELLED` with correct badge colors.

## 6. Event Types & Schema

- Add `DEPENDENCY_RETRY` to `event-types.ts`.
- Add nullable `email_status` column to `VinAddRequest` entity.

## 7. E2E Tests

- `e2e/admin-portal.spec.ts`:
  - Admin login via role picker.
  - Contract search by each field.
  - Contract detail navigation.
  - Request detail with audit timeline.
  - Add note, verify in timeline.
  - Role-based field visibility.

---

## Gap Mapping

| # | Gap | Section | Severity |
|---|-----|---------|----------|
| 1 | Consumer authGuard on admin routes | 1 | Critical |
| 2 | No admin login/SSO page | 1 | Critical |
| 3 | Contract detail loadData() is stub | 2 | Critical |
| 4 | No GET /admin/contracts/:id endpoint | 2 | Critical |
| 5 | No admin JWT issuance endpoint | 1 | Critical |
| 6 | Mock doesn't simulate admin auth | 1 | High |
| 7 | No role-based field filtering | 3 | High |
| 8 | Unbounded empty search | 4 | High |
| 9 | AdminUser entity unused | 3 | Medium |
| 10 | Mock ignores requestId filter | 4 | Medium |
| 11 | Role name mismatch | 3 | Medium |
| 12 | No @Roles() system | 3 | Medium |
| 13 | Dashboard status labels incomplete | 5 | Low |
| 14 | DEPENDENCY_RETRY event type missing | 6 | Low |
| 15 | email_status column missing | 6 | Low |
| 16 | No admin identity in layout | 3 | Low |
| 17 | No admin logout | 3 | Low |
| 18 | No admin E2E tests | 7 | Low |
