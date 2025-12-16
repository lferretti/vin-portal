# VIN Portal Implementation Plan

> **Angular Version:** 19 (Angular 21 features used where available)  
> **Status:** ✅ FULLY IMPLEMENTED  
> **Last Updated:** December 2024

## Executive Summary

This is a **Consumer VIN Add Portal** - a public-facing Angular application that allows warranty contract holders to authenticate and add **one additional VIN** to their contract (one-time, irreversible action).

### Core Business Rules
- Contract is sold for a primary VIN
- Customer may add **one** additional VIN **ever** to share contract benefits
- Added VIN must be **same class or less** compared to the contract's primary VIN
- Once committed and validated, the customer **cannot change it**

---

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| ✅ Phase 1: Foundation | **Complete** | Core infrastructure & shared components |
| ✅ Phase 2: Consumer Portal | **Complete** | Wizard flow pages (6 pages) |
| ✅ Phase 3: Admin Portal | **Complete** | Support dashboard (4 pages) |
| ✅ Phase 4: Testing & Polish | **Complete** | Mock backend, guards, 85 unit tests |

---

## Architecture Overview

| Layer | Description |
|-------|-------------|
| **Consumer Portal** | Wizard-style flow for customers to add a VIN |
| **Admin Portal** | Internal support/security team dashboard |
| **Mock API Service** | Complete mock backend for development |
| **State Management** | Session tokens via signals, form state |
| **Security** | Rate limiting, OTP step-up, idempotency |

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 19.2 | Frontend framework |
| TypeScript | ~5.7 | Type safety |
| RxJS | ~7.8 | Reactive programming |
| Tailwind CSS | 4.x | Utility-first styling |
| Jest | 29.x | Unit testing (85 tests) |
| jest-preset-angular | 16.x | Angular Jest integration |

### Angular Features Used
- Standalone components (all components)
- Signal-based reactivity (`signal()`, `computed()`)
- New control flow syntax (`@if`, `@for`, `@switch`)
- Input signals (`input()`, `input.required()`)
- Model signals (`model()`)
- Functional guards (`CanActivateFn`)
- Functional interceptors (`HttpInterceptorFn`)

---

## Consumer Portal Routes

| Route | Component | Guard | Description |
|-------|-----------|-------|-------------|
| `/` | LandingComponent | - | Entry point with CTA |
| `/authenticate` | AuthenticateComponent | - | Contract authentication |
| `/verify-otp` | VerifyOtpComponent | otpRequiredGuard | OTP verification |
| `/vin-entry` | VinEntryComponent | authGuard | VIN decode & eligibility |
| `/review` | ReviewComponent | authGuard, eligibleGuard | Confirmation before commit |
| `/result/:requestId` | ResultComponent | authGuard | Status with polling |

---

## Admin Portal Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | AdminDashboardComponent | Dashboard landing |
| `/admin/search` | ContractSearchComponent | Contract search |
| `/admin/contract/:id` | ContractDetailComponent | Contract details |
| `/admin/request/:id` | RequestDetailComponent | Request detail + notes |

---

## Test Credentials (Mock API)

| Contract Number | Last Name | ZIP | Behavior |
|-----------------|-----------|-----|----------|
| `CONTRACT-001` | `SMITH` | `30301` | Normal flow |
| `CONTRACT-002` | `JOHNSON` | `90210` | Normal flow |
| `CONTRACT-OTP` | `TESTUSER` | `12345` | Requires OTP (code: 123456) |
| `CONTRACT-LOCKED` | `LOCKED` | `99999` | Already has additional VIN |

### Test VINs

| VIN | Behavior |
|-----|----------|
| `1HGCM82633A123456` | Eligible - Honda Accord 2003 |
| `1G1YY22G965123456` | **Ineligible** - CLASS_TOO_HIGH |
| `5FNRL38437B123456` | **Ineligible** - VIN_ALREADY_USED |
| Any valid 17-char VIN | Eligible with random decode |

---

## Running the Application

```bash
# Install dependencies
npm install

# Start development server (mock API enabled)
ng serve

# Run unit tests (Jest)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Build for production
ng build --configuration production
```

---

## Key Files Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/           # auth, eligible, otpRequired guards
│   │   ├── interceptors/     # auth, correlation, error, mock interceptors
│   │   ├── models/           # All API interfaces & enums
│   │   └── services/         # API, Session, VIN, Contract, OTP, Admin, Mock services
│   ├── features/
│   │   ├── admin/            # Admin portal feature
│   │   │   ├── layout/       # Admin layout component
│   │   │   └── pages/        # Dashboard, Search, Detail pages
│   │   └── consumer/         # Consumer portal feature
│   │       ├── pages/        # Landing, Auth, OTP, VIN, Review, Result
│   │       └── state/        # ConsumerStateService
│   └── shared/
│       ├── components/       # Header, Progress, Alert, Spinner, FormField, etc.
│       └── validators/       # VIN and ZIP validators with tests
├── environments/             # Dev & prod environment configs
└── styles.css               # Tailwind v4 + custom theme
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `angular.json` | Angular CLI config, Jest test builder |
| `jest.config.js` | Jest configuration with path aliases |
| `setup-jest.ts` | Jest zone.js setup |
| `tailwind.config.js` | Tailwind theme customization |
| `.postcssrc.json` | PostCSS/Tailwind integration |
| `tsconfig.json` | TypeScript config with path aliases |

---

## Related Documentation

- [Phase 1: Foundation](./phase-1-foundation.md)
- [Phase 2: Consumer Portal](./phase-2-consumer-portal.md)
- [Phase 3: Admin Portal](./phase-3-admin-portal.md)
- [Phase 4: Testing & Polish](./phase-4-testing.md)
- [File Structure](./file-structure.md)
- [Original Specs](../)
